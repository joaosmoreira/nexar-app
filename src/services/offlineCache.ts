import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';

// ─────────────────────────────────────────────
//  Tipos
// ─────────────────────────────────────────────

export interface CacheData {
  projetos?: any[];
  projetoArquivados?: any[];
  /** keyed by projetoId */
  ofsByProjeto?: Record<number, any[]>;
  /** keyed by ofId */
  tarefasByOf?: Record<number, any[]>;
  updatedAt?: string;
}

export type MutationAction =
  | { action: 'createProjeto';   tempId: number; nome: string; cliente: string }
  | { action: 'createOF';        tempId: number; projetoId: number; nomeOf: string; numeroOf: string; prazoLimite?: string | null }
  | { action: 'toggleTarefa';    tarefaId: number; concluido: boolean }
  | { action: 'arquivarProjeto'; projetoId: number }
  | { action: 'deleteProjeto';   projetoId: number }
  | { action: 'deleteOF';        ofId: number }
  | { action: 'createTarefa';    tempId: number; ordemId: number; nome: string; index: number }
  | { action: 'updateUltimoMovimento'; projetoId: number }
  | { action: 'updateOF'; ofId: number; fields: { nome_of?: string; numero_of?: string; notas?: string } }
  | { action: 'updateTarefa'; tarefaId: number; nome: string }
  | { action: 'deleteTarefa'; tarefaId: number }
  | { action: 'reorderTarefas'; tarefas: { id: number; ordem_index: number }[] }
  | { action: 'reorderProjetos'; projetos: { id: number; ordem_index: number }[] }
  | { action: 'updateProjetoNotas'; projetoId: number; notas: string };

interface PendingQueue {
  mutations: MutationAction[];
}

const CACHE_FILE    = 'nexar-cache.json';
const PENDING_FILE  = 'nexar-pending.json';
const BASE          = BaseDirectory.AppData;

// ─────────────────────────────────────────────
//  Conectividade
// ─────────────────────────────────────────────

export function isOnline(): boolean {
  return navigator.onLine;
}

// ─────────────────────────────────────────────
//  Cache de dados (leitura/escrita)
// ─────────────────────────────────────────────

export async function readCache(): Promise<CacheData> {
  try {
    const fileExists = await exists(CACHE_FILE, { baseDir: BASE });
    if (!fileExists) return {};
    const raw = await readTextFile(CACHE_FILE, { baseDir: BASE });
    return JSON.parse(raw) as CacheData;
  } catch {
    return {};
  }
}

export async function writeCache(data: CacheData): Promise<void> {
  try {
    const updated: CacheData = { ...data, updatedAt: new Date().toISOString() };
    await writeTextFile(CACHE_FILE, JSON.stringify(updated, null, 2), { baseDir: BASE });
  } catch (e) {
    console.error('[offlineCache] Erro ao escrever cache:', e);
  }
}

/** Merge parcial no cache existente (sem apagar outras chaves) */
export async function patchCache(patch: Partial<CacheData>): Promise<void> {
  const existing = await readCache();
  await writeCache({ ...existing, ...patch });
}

// ─────────────────────────────────────────────
//  Fila de mutações pendentes
// ─────────────────────────────────────────────

export async function readPending(): Promise<MutationAction[]> {
  try {
    const fileExists = await exists(PENDING_FILE, { baseDir: BASE });
    if (!fileExists) return [];
    const raw = await readTextFile(PENDING_FILE, { baseDir: BASE });
    const parsed: PendingQueue = JSON.parse(raw);
    return parsed.mutations || [];
  } catch {
    return [];
  }
}

export async function writePending(mutations: MutationAction[]): Promise<void> {
  try {
    await writeTextFile(PENDING_FILE, JSON.stringify({ mutations }, null, 2), { baseDir: BASE });
  } catch (e) {
    console.error('[offlineCache] Erro ao escrever fila pendente:', e);
  }
}

export async function queueMutation(mutation: MutationAction): Promise<void> {
  const current = await readPending();
  await writePending([...current, mutation]);
}

export async function clearPending(): Promise<void> {
  await writePending([]);
}

// ─────────────────────────────────────────────
//  Gerador de IDs temporários (negativos)
// ─────────────────────────────────────────────

let _tempIdCounter = -1;
export function nextTempId(): number {
  return _tempIdCounter--;
}

// ─────────────────────────────────────────────
//  Flush de mutações pendentes ao voltar online
// ─────────────────────────────────────────────

export interface RemoteApi {
  createProjetoRemote: (nome: string, cliente: string) => Promise<any>;
  createOFRemote: (projetoId: number, nomeOf: string, numeroOf: string, prazoLimite?: string | null) => Promise<any>;
  toggleTarefaConcluidaRemote: (tarefaId: number, concluido: boolean) => Promise<void>;
  arquivarProjetoRemote: (id: number) => Promise<void>;
  deleteProjetoRemote: (id: number) => Promise<void>;
  deleteOrdemFabricoRemote: (id: number) => Promise<void>;
  createTarefaRemote: (ordemId: number, nome: string, index: number) => Promise<any>;
  updateProjectoUltimoMovimentoRemote: (id: number) => Promise<void>;
  updateOrdemFabricoRemote?: (ofId: number, fields: { nome_of?: string; numero_of?: string; notas?: string }) => Promise<void>;
  updateTarefaRemote?: (tarefaId: number, nome: string) => Promise<void>;
  deleteTarefaRemote?: (tarefaId: number) => Promise<void>;
  reorderTarefasRemote?: (tarefas: { id: number; ordem_index: number }[]) => Promise<void>;
  reorderProjetosRemote?: (projetos: { id: number; ordem_index: number }[]) => Promise<void>;
  updateProjetoNotasRemote?: (projetoId: number, notas: string) => Promise<void>;
}

/**
 * Executa todas as mutações pendentes no Supabase, por ordem.
 * Resolve IDs temporários (negativos) para IDs reais à medida que avança.
 * Recebe o api como argumento para evitar dependência circular.
 */
export async function flushPendingMutations(api: RemoteApi): Promise<{ flushed: number; errors: string[] }> {
  const mutations = await readPending();
  if (mutations.length === 0) return { flushed: 0, errors: [] };

  // Mapa de resolução: tempId (negativo) → id real Supabase
  const idMap: Record<number, number> = {};

  const resolveId = (id: number): number => (id < 0 && idMap[id] !== undefined ? idMap[id] : id);

  const errors: string[] = [];
  let flushed = 0;

  for (const mut of mutations) {
    try {
      switch (mut.action) {

        case 'createProjeto': {
          const proj = await api.createProjetoRemote(mut.nome, mut.cliente);
          idMap[mut.tempId] = proj.id;
          flushed++;
          break;
        }

        case 'createOF': {
          const realProjetoId = resolveId(mut.projetoId);
          const of = await api.createOFRemote(realProjetoId, mut.nomeOf, mut.numeroOf, mut.prazoLimite);
          idMap[mut.tempId] = of.id;
          flushed++;
          break;
        }

        case 'toggleTarefa': {
          const realTarefaId = resolveId(mut.tarefaId);
          await api.toggleTarefaConcluidaRemote(realTarefaId, mut.concluido);
          flushed++;
          break;
        }

        case 'arquivarProjeto': {
          const realId = resolveId(mut.projetoId);
          await api.arquivarProjetoRemote(realId);
          flushed++;
          break;
        }

        case 'deleteProjeto': {
          const realId = resolveId(mut.projetoId);
          await api.deleteProjetoRemote(realId);
          flushed++;
          break;
        }

        case 'deleteOF': {
          const realId = resolveId(mut.ofId);
          await api.deleteOrdemFabricoRemote(realId);
          flushed++;
          break;
        }

        case 'createTarefa': {
          const realOrdemId = resolveId(mut.ordemId);
          const tarefa = await api.createTarefaRemote(realOrdemId, mut.nome, mut.index);
          idMap[mut.tempId] = tarefa.id;
          flushed++;
          break;
        }

        case 'updateUltimoMovimento': {
          const realId = resolveId(mut.projetoId);
          await api.updateProjectoUltimoMovimentoRemote(realId);
          flushed++;
          break;
        }

        case 'updateOF': {
          const realId = resolveId(mut.ofId);
          if (api.updateOrdemFabricoRemote) await api.updateOrdemFabricoRemote(realId, mut.fields);
          flushed++;
          break;
        }

        case 'updateProjetoNotas': {
          const realId = resolveId(mut.projetoId);
          if (api.updateProjetoNotasRemote) await api.updateProjetoNotasRemote(realId, mut.notas);
          flushed++;
          break;
        }

        case 'updateTarefa': {
          const realId = resolveId(mut.tarefaId);
          if (api.updateTarefaRemote) await api.updateTarefaRemote(realId, mut.nome);
          flushed++;
          break;
        }

        case 'deleteTarefa': {
          const realId = resolveId(mut.tarefaId);
          if (api.deleteTarefaRemote) await api.deleteTarefaRemote(realId);
          flushed++;
          break;
        }

        case 'reorderTarefas': {
          if (api.reorderTarefasRemote) {
            const translated = mut.tarefas.map(t => ({ id: resolveId(t.id), ordem_index: t.ordem_index }));
            await api.reorderTarefasRemote(translated);
          }
          flushed++;
          break;
        }
        case 'reorderProjetos': {
          if (api.reorderProjetosRemote) {
            const translated = mut.projetos.map(p => ({ id: resolveId(p.id), ordem_index: p.ordem_index }));
            await api.reorderProjetosRemote(translated);
          }
          flushed++;
          break;
        }
      }
    } catch (e: any) {
      const msg = `[${mut.action}] ${e?.message || 'erro desconhecido'}`;
      console.error('[offlineCache] Flush error:', msg, mut);
      errors.push(msg);
      // Continua para as próximas mutações em vez de parar
    }
  }

  await clearPending();
  return { flushed, errors };
}
