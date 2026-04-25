import { supabase } from '../supabaseClient';
import { isOnline, readCache, patchCache, queueMutation, readPending, nextTempId } from './offlineCache';

// Re-exportar tipos
export * from './types';

// Re-exportar serviços
export * from './projectService';
export * from './ofService';
export * from './taskService';
export * from './userService';
export * from './metricsService';

// ─────────────────────────────────────────────────────────────────
//  FACHADA UNIFICADA (Lógica de Orquestração Online/Offline)
// ─────────────────────────────────────────────────────────────────

import {
  createProjetoRemote, arquivarProjetoRemote, deleteProjetoRemote,
  updateProjectoUltimoMovimentoRemote, updateProjetoNotasRemote, updateProjetoRemote, reorderProjetosRemote
} from './projectService';

import {
  createOFRemote, deleteOrdemFabricoRemote,
  updateOrdemFabricoRemote, reorderTarefasRemote
} from './ofService';

import {
  createTarefaRemote, toggleTarefaConcluidaRemote,
  updateTarefaRemote, deleteTarefaRemote
} from './taskService';

import { Projeto, OrdemFabrico, Tarefa } from './types';

// WRAPPERS COM LÓGICA OFFLINE

export async function toggleTarefaConcluida(tarefaId: number, concluido: boolean) {
  if (isOnline()) {
    await toggleTarefaConcluidaRemote(tarefaId, concluido);
  } else {
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    for (const ofId in tarefasByOf) {
      tarefasByOf[ofId] = tarefasByOf[ofId].map((t: any) =>
        t.id === tarefaId ? { ...t, concluido } : t
      );
    }
    const ofsByProjeto = { ...(cache.ofsByProjeto || {}) };
    for (const projId in ofsByProjeto) {
      ofsByProjeto[projId] = ofsByProjeto[projId].map((of: any) => ({
        ...of,
        tarefas: (of.tarefas || []).map((t: any) =>
          t.id === tarefaId ? { ...t, concluido } : t
        ),
      }));
    }
    await patchCache({ tarefasByOf, ofsByProjeto });
    await queueMutation({ action: 'toggleTarefa', tarefaId, concluido });
  }
}

export async function updateProjectoUltimoMovimento(projetoId: number) {
  if (isOnline()) {
    await updateProjectoUltimoMovimentoRemote(projetoId);
  } else {
    await queueMutation({ action: 'updateUltimoMovimento', projetoId });
  }
}

export async function updateProjetoNotas(projetoId: number, notas: string) {
  if (isOnline()) {
    await updateProjetoNotasRemote(projetoId, notas);
  } else {
    const cache = await readCache();
    const projetos = (cache.projetos || []).map((p: any) =>
      p.id === projetoId ? { ...p, informacoes_gerais: notas } : p
    );
    const arquivados = (cache.projetoArquivados || []).map((p: any) =>
      p.id === projetoId ? { ...p, informacoes_gerais: notas } : p
    );
    await patchCache({ projetos, projetoArquivados: arquivados });
    await queueMutation({ action: 'updateProjetoNotas', projetoId, notas });
  }
}

export async function updateProjeto(projetoId: number, fields: { anexo_url?: string | null }) {
  if (isOnline()) {
    await updateProjetoRemote(projetoId, fields);
  } else {
    const cache = await readCache();
    const projetos = (cache.projetos || []).map((p: any) =>
      p.id === projetoId ? { ...p, ...fields } : p
    );
    const arquivados = (cache.projetoArquivados || []).map((p: any) =>
      p.id === projetoId ? { ...p, ...fields } : p
    );
    await patchCache({ projetos, projetoArquivados: arquivados });
    await queueMutation({ action: 'updateProjeto', projetoId, fields });
  }
}

export async function createOF(
  projetoId: number,
  nomeOf: string,
  numeroOf: string,
  prazoLimite?: string | null
): Promise<OrdemFabrico> {
  if (isOnline()) {
    return createOFRemote(projetoId, nomeOf, numeroOf, prazoLimite);
  } else {
    const tempId = nextTempId();
    const now = new Date().toISOString();
    const predefinedTasks = [
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Modelação', concluido: false, ordem_index: 0 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Aprovisionamento Material', concluido: false, ordem_index: 1 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Validação', concluido: false, ordem_index: 2 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Fabrico', concluido: false, ordem_index: 3 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Parafusaria', concluido: false, ordem_index: 4 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Montagem', concluido: false, ordem_index: 5 },
    ];
    const newOf: OrdemFabrico = {
      id: tempId,
      projeto_id: projetoId,
      nome_of: nomeOf,
      numero_of: numeroOf,
      status: 'em_progresso',
      criado_em: now,
      prazo_limite: prazoLimite || null,
      tarefas: predefinedTasks.map(t => ({
        id: t.id,
        ordem_id: t.ordem_id,
        nome_tarefa: t.nome_tarefa,
        concluido: t.concluido,
        ordem_index: t.ordem_index
      })),
    };

    const cache = await readCache();
    const ofsByProjeto = { ...(cache.ofsByProjeto || {}) };
    ofsByProjeto[projetoId] = [newOf, ...(ofsByProjeto[projetoId] || [])];
    const tarefasByOf = { ...(cache.tarefasByOf || {}), [tempId]: predefinedTasks };
    await patchCache({ ofsByProjeto, tarefasByOf });
    await queueMutation({ action: 'createOF', tempId, projetoId, nomeOf, numeroOf, prazoLimite });
    return newOf;
  }
}

export async function createProjeto(nome: string, cliente: string, userId?: string): Promise<Projeto> {
  if (isOnline()) {
    return createProjetoRemote(nome, cliente, userId);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    const tempId = nextTempId();
    const now = new Date().toISOString();
    const newProjeto: Projeto = {
      id: tempId,
      user_id: userId || user?.id || 'offline-user',
      nome,
      cliente,
      criado_em: now,
      arquivado: false
    };

    const cache = await readCache();
    const projetos = [newProjeto, ...(cache.projetos || [])];
    await patchCache({ projetos });
    await queueMutation({ action: 'createProjeto', tempId, nome, cliente, userId });
    return newProjeto;
  }
}

export async function arquivarProjeto(id: number) {
  if (isOnline()) {
    await arquivarProjetoRemote(id);
  } else {
    const cache = await readCache();
    const projetos = (cache.projetos || []).filter((p: any) => p.id !== id);
    await patchCache({ projetos });
    await queueMutation({ action: 'arquivarProjeto', projetoId: id });
  }
}

export async function deleteProjeto(id: number) {
  if (isOnline()) {
    await deleteProjetoRemote(id);
  } else {
    const cache = await readCache();
    const projetos = (cache.projetos || []).filter((p: any) => p.id !== id);
    await patchCache({ projetos });
    await queueMutation({ action: 'deleteProjeto', projetoId: id });
  }
}

export async function deleteOrdemFabrico(id: number) {
  if (isOnline()) {
    await deleteOrdemFabricoRemote(id);
  } else {
    const cache = await readCache();
    const ofsByProjeto = { ...(cache.ofsByProjeto || {}) };
    for (const projId in ofsByProjeto) {
      ofsByProjeto[projId] = ofsByProjeto[projId].filter((of: any) => of.id !== id);
    }
    await patchCache({ ofsByProjeto });
    await queueMutation({ action: 'deleteOF', ofId: id });
  }
}

export async function createTarefa(ofId: number, nomeTarefa: string, index: number): Promise<Tarefa> {
  if (isOnline()) {
    return createTarefaRemote(ofId, nomeTarefa, index);
  } else {
    const tempId = nextTempId();
    const newTarefa: Tarefa = {
      id: tempId, ordem_id: ofId, nome_tarefa: nomeTarefa, concluido: false, ordem_index: index,
    };
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    tarefasByOf[ofId] = [...(tarefasByOf[ofId] || []), newTarefa];
    await patchCache({ tarefasByOf });
    await queueMutation({ action: 'createTarefa', tempId, ordemId: ofId, nome: nomeTarefa, index });
    return newTarefa;
  }
}

export async function updateOrdemFabrico(ofId: number, fields: { nome_of?: string; numero_of?: string; notas?: string; prazo_limite?: string | null; anexo_url?: string | null }) {
  if (isOnline()) {
    await updateOrdemFabricoRemote(ofId, fields);
  } else {
    const cache = await readCache();
    const ofsByProjeto = { ...(cache.ofsByProjeto || {}) };
    for (const projId in ofsByProjeto) {
      ofsByProjeto[projId] = ofsByProjeto[projId].map((of: any) =>
        of.id === ofId ? { ...of, ...fields } : of
      );
    }
    await patchCache({ ofsByProjeto });
    await queueMutation({ action: 'updateOF', ofId, fields });
  }
}

export async function updateTarefa(tarefaId: number, nomeTarefa: string) {
  if (isOnline()) {
    await updateTarefaRemote(tarefaId, nomeTarefa);
  } else {
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    for (const ofId in tarefasByOf) {
      tarefasByOf[ofId] = tarefasByOf[ofId].map((t: any) =>
        t.id === tarefaId ? { ...t, nome_tarefa: nomeTarefa } : t
      );
    }
    await patchCache({ tarefasByOf });
    await queueMutation({ action: 'updateTarefa', tarefaId, nome: nomeTarefa });
  }
}

export async function deleteTarefa(tarefaId: number) {
  if (isOnline()) {
    await deleteTarefaRemote(tarefaId);
  } else {
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    for (const ofId in tarefasByOf) {
      tarefasByOf[ofId] = tarefasByOf[ofId].filter((t: any) => t.id !== tarefaId);
    }
    await patchCache({ tarefasByOf });
    await queueMutation({ action: 'deleteTarefa', tarefaId });
  }
}

export async function reorderTarefas(tarefas: { id: number; ordem_index: number }[]) {
  if (isOnline()) {
    await reorderTarefasRemote(tarefas);
  } else {
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    const indexMap = new Map(tarefas.map(t => [t.id, t.ordem_index]));
    for (const ofId in tarefasByOf) {
      tarefasByOf[ofId] = tarefasByOf[ofId].map((t: any) =>
        indexMap.has(t.id) ? { ...t, ordem_index: indexMap.get(t.id) } : t
      );
    }
    await patchCache({ tarefasByOf });
    await queueMutation({ action: 'reorderTarefas', tarefas });
  }
}

export async function reorderProjetos(projetos: { id: number; ordem_index: number }[]) {
  if (isOnline()) {
    await reorderProjetosRemote(projetos);
  } else {
    const cache = await readCache();
    const indexMap = new Map(projetos.map(p => [p.id, p.ordem_index]));
    const updated = (cache.projetos || []).map((p: any) =>
      indexMap.has(p.id) ? { ...p, ordem_index: indexMap.get(p.id) } : p
    );
    await patchCache({ projetos: updated });
    await queueMutation({ action: 'reorderProjetos', projetos });
  }
}

/** Retorna dados do cache imediatamente para o ProjectView usar como preview */
export async function getCachedProjectDetails(projetoId: number): Promise<{ projeto: Projeto | null, ofs: OrdemFabrico[] }> {
  const cache = await readCache();
  const allProjs = [...(cache.projetos || []), ...(cache.projetoArquivados || [])];
  const projeto = allProjs.find(p => p.id === projetoId) || null;
  const ofs = (cache.ofsByProjeto || {})[projetoId] || [];
  return { projeto, ofs };
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-ARCHIVE (apenas online)
// ─────────────────────────────────────────────────────────────────

export async function runAutoArchive() {
  if (!isOnline()) return;

  const now = Date.now();
  const SevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(now - SevenDaysMs).toISOString();

  const { data: projects, error } = await supabase
    .from('projectos')
    .select('id, nome, ultimo_movimento, ordens_fabrico(id, tarefas(concluido))')
    .eq('arquivado', false)
    .lt('ultimo_movimento', cutoffDate);

  if (error || !projects) return;

  for (const p of projects) {
    const ofs = (p.ordens_fabrico as any[]) || [];
    if (ofs.length === 0) continue;

    const allFinished = ofs.every(of => {
      const tasks = of.tarefas || [];
      return tasks.length > 0 && tasks.every((t: any) => t.concluido);
    });

    if (allFinished) {
      await arquivarProjetoRemote(p.id);
    }
  }
}

// Helper para mutações pendentes
export async function getPendingCount(): Promise<number> {
  const q = await readPending();
  return q.length;
}
