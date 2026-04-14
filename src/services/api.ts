import { supabase } from '../supabaseClient';
import {
  isOnline,
  readCache,
  patchCache,
  queueMutation,
  readPending,
  nextTempId,
} from './offlineCache';

export interface Projeto {
  id: number;
  nome: string;
  cliente: string;
  criado_em: string;
  arquivado?: boolean;
  informacoes_gerais?: string;
}

export interface OrdemFabrico {
  id: number;
  projeto_id: number;
  nome_of: string;
  numero_of: string;
  status: string;
  criado_em: string;
  prazo_limite?: string | null;
  tarefas?: { concluido: boolean }[];
  notas?: string;
}

export interface Tarefa {
  id: number;
  ordem_id: number;
  nome_tarefa: string;
  concluido: boolean;
  ordem_index: number;
}

// ─────────────────────────────────────────────────────────────────
//  LEITURAS
// ─────────────────────────────────────────────────────────────────

export async function fetchProjetos(): Promise<Projeto[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('projectos')
      .select('*')
      .or('arquivado.eq.false,arquivado.is.null')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    const projetos = data as Projeto[];
    await patchCache({ projetos });
    return projetos;
  } else {
    const cache = await readCache();
    return cache.projetos || [];
  }
}

export async function fetchProjetosArquivados(): Promise<Projeto[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('projectos')
      .select('*')
      .eq('arquivado', true)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    const projetoArquivados = data as Projeto[];
    await patchCache({ projetoArquivados });
    return projetoArquivados;
  } else {
    const cache = await readCache();
    return cache.projetoArquivados || [];
  }
}

export async function fetchOfsByProjeto(projetoId: number): Promise<OrdemFabrico[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('ordens_fabrico')
      .select('*, tarefas(*)')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: false });
    if (error) throw error;
    const ofs = data as OrdemFabrico[];
    const cache = await readCache();
    await patchCache({
      ofsByProjeto: { ...(cache.ofsByProjeto || {}), [projetoId]: ofs },
    });
    return ofs;
  } else {
    const cache = await readCache();
    return (cache.ofsByProjeto || {})[projetoId] || [];
  }
}

export async function fetchTarefasByOf(ofId: number): Promise<Tarefa[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('ordem_id', ofId)
      .order('ordem_index', { ascending: true });
    if (error) throw error;
    const tarefas = data as Tarefa[];
    const cache = await readCache();
    await patchCache({
      tarefasByOf: { ...(cache.tarefasByOf || {}), [ofId]: tarefas },
    });
    return tarefas;
  } else {
    const cache = await readCache();
    return (cache.tarefasByOf || {})[ofId] || [];
  }
}

export async function fetchDashboardMetrics(isArchiveMode: boolean) {
  if (isOnline()) {
    let query = supabase
      .from('projectos')
      .select('*, ordens_fabrico(id, tarefas(concluido))')
      .order('criado_em', { ascending: false });

    if (isArchiveMode) {
      query = query.eq('arquivado', true);
    } else {
      query = query.or('arquivado.eq.false,arquivado.is.null');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } else {
    // Constrói métricas offline a partir do cache
    const cache = await readCache();
    const projetos = isArchiveMode
      ? (cache.projetoArquivados || [])
      : (cache.projetos || []);
    const ofsByProjeto = cache.ofsByProjeto || {};

    return projetos.map((p: any) => ({
      ...p,
      ordens_fabrico: (ofsByProjeto[p.id] || []).map((of: any) => ({
        id: of.id,
        tarefas: of.tarefas || [],
      })),
    }));
  }
}

/**
 * Devolve as OFs abertas há mais tempo (progress < 100), ordenadas por criado_em ASC.
 * Usado no GlobalDashboard para a secção de alertas.
 */
export async function fetchAlertOFs(limit = 6): Promise<any[]> {
  const isOpenOf = (of: any) => {
    const total = of.tarefas?.length || 0;
    if (total === 0) return true;
    return of.tarefas.filter((t: any) => t.concluido).length < total;
  };

  if (isOnline()) {
    const { data, error } = await supabase
      .from('ordens_fabrico')
      .select('id, numero_of, nome_of, criado_em, prazo_limite, projeto_id, tarefas(concluido), projectos(nome)')
      .order('criado_em', { ascending: true })
      .limit(60); // pool alargado para garantir 6 candidatos após filtragem

    if (error) throw error;

    const open: any[] = (data || []).filter(isOpenOf);

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Urgentes: têm prazo definido e faltam ≤ 7 dias (e ainda não expirou)
    const urgent = open.filter((of: any) => {
      if (!of.prazo_limite) return false;
      const diff = new Date(of.prazo_limite).getTime() - now;
      return diff >= 0 && diff <= sevenDaysMs;
    }).sort((a: any, b: any) =>
      new Date(a.prazo_limite).getTime() - new Date(b.prazo_limite).getTime()
    );

    const urgentIds = new Set(urgent.map((of: any) => of.id));

    // Restantes: abertas há mais tempo (já ordenadas por criado_em ASC)
    const oldest = open.filter((of: any) => !urgentIds.has(of.id));

    return [...urgent, ...oldest].slice(0, limit);
  } else {
    // Offline: usa o cache
    const cache = await readCache();
    const ofsByProjeto = cache.ofsByProjeto || {};
    const projetos: Projeto[] = [...(cache.projetos || []), ...(cache.projetoArquivados || [])];
    const projetoMap = new Map(projetos.map((p) => [p.id, p.nome]));

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const allOfs: any[] = (Object.values(ofsByProjeto) as any[][])
      .flat()
      .filter((of: any) => {
        const total = of.tarefas?.length || 0;
        if (total === 0) return true;
        return of.tarefas.filter((t: any) => t.concluido).length < total;
      })
      .map((of: any) => ({ ...of, projectos: { nome: projetoMap.get(of.projeto_id) || '' } }));

    const urgent = allOfs
      .filter((of: any) => {
        if (!of.prazo_limite) return false;
        const diff = new Date(of.prazo_limite).getTime() - now;
        return diff >= 0 && diff <= sevenDaysMs;
      })
      .sort((a: any, b: any) => new Date(a.prazo_limite).getTime() - new Date(b.prazo_limite).getTime());

    const urgentIds = new Set(urgent.map((of: any) => of.id));

    const oldest = allOfs
      .filter((of: any) => !urgentIds.has(of.id))
      .sort((a: any, b: any) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());

    return [...urgent, ...oldest].slice(0, limit);
  }
}


/**
 * Fetch rápido das OFs com prazo_limite nos próximos 7 dias (ainda abertas).
 * Cacheado externamente — chamado apenas uma vez por sessão/dia.
 */
export async function fetchOfsWithDeadlineSoon(): Promise<{ projeto_id: number; prazo_limite: string }[]> {
  if (!isOnline()) return [];
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('ordens_fabrico')
    .select('id, projeto_id, prazo_limite, tarefas(concluido)')
    .not('prazo_limite', 'is', null)
    .lte('prazo_limite', in7Days)
    .gte('prazo_limite', now.toISOString());

  if (error) return [];

  // Filtra apenas as que ainda não estão concluídas
  return (data || [])
    .filter((of: any) => {
      const total = of.tarefas?.length || 0;
      if (total === 0) return true;
      return of.tarefas.filter((t: any) => t.concluido).length < total;
    })
    .map((of: any) => ({ projeto_id: of.projeto_id, prazo_limite: of.prazo_limite }));
}

/**
 * Devolve os IDs de projetos onde TODAS as OFs têm TODAS as tarefas concluídas.
 * Cacheado externamente — chamado apenas uma vez por sessão/dia.
 */
export async function fetchProjectsCompletionStatus(): Promise<number[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('ordens_fabrico')
    .select('projeto_id, tarefas(concluido)');

  if (error || !data) return [];

  // Agrupa por projeto_id e verifica se todas as OFs estão totalmente concluídas
  const byProject = new Map<number, boolean>();
  for (const of_ of data as any[]) {
    const projId = of_.projeto_id;
    const total = of_.tarefas?.length || 0;
    const allDone = total > 0 && (of_.tarefas as any[]).every((t: any) => t.concluido);
    const prev = byProject.get(projId);
    if (prev === undefined) {
      byProject.set(projId, allDone);
    } else {
      // Se qualquer OF não estiver concluída, o projeto não está concluído
      if (!allDone) byProject.set(projId, false);
    }
  }

  return [...byProject.entries()]
    .filter(([, done]) => done)
    .map(([id]) => id);
}


/**
 * Devolve o próximo número sequencial para OFs do projeto GS0000.
 * Formato: 00000001, 00000002, ...
 */
export async function fetchNextGs0000OfNumber(projetoId: number): Promise<string> {
  if (isOnline()) {
    const { data } = await supabase
      .from('ordens_fabrico')
      .select('numero_of')
      .eq('projeto_id', projetoId)
      .order('numero_of', { ascending: false });

    if (!data || data.length === 0) return '00000001';

    // Filtra os que são puramente numéricos (sequência GS0000)
    const nums = data
      .map((of: any) => parseInt(of.numero_of, 10))
      .filter((n: number) => !isNaN(n));

    if (nums.length === 0) return '00000001';

    const maxNum = Math.max(...nums);
    return String(maxNum + 1).padStart(8, '0');
  } else {
    const cache = await readCache();
    const ofs: OrdemFabrico[] = (cache.ofsByProjeto || {})[projetoId] || [];
    const nums = ofs
      .map((of) => parseInt(of.numero_of, 10))
      .filter((n) => !isNaN(n));
    if (nums.length === 0) return '00000001';
    const maxNum = Math.max(...nums);
    return String(maxNum + 1).padStart(8, '0');
  }
}

export async function globalSearch(term: string) {
  if (!term || term.trim().length < 2) return { projetos: [], ofs: [] };

  if (isOnline()) {
    const searchPattern = `%${term.trim()}%`;
    const [pResult, oResult] = await Promise.all([
      supabase
        .from('projectos')
        .select('id, nome, cliente, arquivado')
        .or(`nome.ilike.${searchPattern},cliente.ilike.${searchPattern}`)
        .limit(10),
      supabase
        .from('ordens_fabrico')
        .select('id, projeto_id, nome_of, numero_of, projectos(nome, cliente)')
        .or(`nome_of.ilike.${searchPattern},numero_of.ilike.${searchPattern}`)
        .limit(10),
    ]);
    return { projetos: pResult.data || [], ofs: oResult.data || [] };
  } else {
    // Pesquisa offline no cache
    const cache = await readCache();
    const t = term.trim().toLowerCase();
    const allProjetos = [
      ...(cache.projetos || []),
      ...(cache.projetoArquivados || []),
    ];
    const allOfs = Object.values(cache.ofsByProjeto || {}).flat() as OrdemFabrico[];

    const projetos = allProjetos
      .filter((p: any) =>
        p.nome?.toLowerCase().includes(t) || p.cliente?.toLowerCase().includes(t)
      )
      .slice(0, 10);

    const ofs = allOfs
      .filter(
        (o: any) =>
          o.nome_of?.toLowerCase().includes(t) ||
          o.numero_of?.toLowerCase().includes(t)
      )
      .slice(0, 10);

    return { projetos, ofs };
  }
}

// ─────────────────────────────────────────────────────────────────
//  ESCRITAS (online + offline com fila)
// ─────────────────────────────────────────────────────────────────

export async function toggleTarefaConcluida(tarefaId: number, concluido: boolean) {
  if (isOnline()) {
    await toggleTarefaConcluidaRemote(tarefaId, concluido);
  } else {
    // Atualiza no cache local
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    for (const ofId in tarefasByOf) {
      tarefasByOf[ofId] = tarefasByOf[ofId].map((t: any) =>
        t.id === tarefaId ? { ...t, concluido } : t
      );
    }
    // Também atualiza em ofsByProjeto (tarefas embutidas)
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
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Modelação',               concluido: false, ordem_index: 0 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Aprovisionamento Material', concluido: false, ordem_index: 1 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Validação',                concluido: false, ordem_index: 2 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Fabrico',                  concluido: false, ordem_index: 3 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Parafusaria',              concluido: false, ordem_index: 4 },
      { id: nextTempId(), ordem_id: tempId, nome_tarefa: 'Montagem',                  concluido: false, ordem_index: 5 },
    ];
    const newOf: OrdemFabrico = {
      id: tempId,
      projeto_id: projetoId,
      nome_of: nomeOf,
      numero_of: numeroOf,
      status: 'em_progresso',
      criado_em: now,
      prazo_limite: prazoLimite || null,
      tarefas: predefinedTasks.map(t => ({ concluido: t.concluido })),
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

export async function createProjeto(nome: string, cliente: string): Promise<Projeto> {
  if (isOnline()) {
    return createProjetoRemote(nome, cliente);
  } else {
    const tempId = nextTempId();
    const now = new Date().toISOString();
    const newProjeto: Projeto = { id: tempId, nome, cliente, criado_em: now, arquivado: false };

    const cache = await readCache();
    const projetos = [newProjeto, ...(cache.projetos || [])];
    await patchCache({ projetos });
    await queueMutation({ action: 'createProjeto', tempId, nome, cliente });
    return newProjeto;
  }
}

export async function arquivarProjeto(id: number) {
  if (isOnline()) {
    await arquivarProjetoRemote(id);
  } else {
    // Remove dos ativos no cache
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

export async function createTarefa(ordemId: number, nomeTarefa: string, index: number): Promise<Tarefa> {
  if (isOnline()) {
    return createTarefaRemote(ordemId, nomeTarefa, index);
  } else {
    const tempId = nextTempId();
    const newTarefa: Tarefa = {
      id: tempId, ordem_id: ordemId, nome_tarefa: nomeTarefa, concluido: false, ordem_index: index,
    };
    const cache = await readCache();
    const tarefasByOf = { ...(cache.tarefasByOf || {}) };
    tarefasByOf[ordemId] = [...(tarefasByOf[ordemId] || []), newTarefa];
    await patchCache({ tarefasByOf });
    await queueMutation({ action: 'createTarefa', tempId, ordemId, nome: nomeTarefa, index });
    return newTarefa;
  }
}

export async function updateOrdemFabrico(ofId: number, fields: { nome_of?: string; numero_of?: string; notas?: string; prazo_limite?: string | null }) {
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

// ─────────────────────────────────────────────────────────────────
//  FUNÇÕES REMOTE (chamadas diretas Supabase — usadas pelo flush)
// ─────────────────────────────────────────────────────────────────

export async function toggleTarefaConcluidaRemote(tarefaId: number, concluido: boolean) {
  const { error } = await supabase.from('tarefas').update({ concluido }).eq('id', tarefaId);
  if (error) throw error;
}

export async function updateProjectoUltimoMovimentoRemote(projetoId: number) {
  const { error } = await supabase
    .from('projectos')
    .update({ ultimo_movimento: new Date().toISOString() })
    .eq('id', projetoId);
  if (error) throw error;
}

export async function updateProjetoNotasRemote(projetoId: number, notas: string) {
  const { error } = await supabase
    .from('projectos')
    .update({ informacoes_gerais: notas })
    .eq('id', projetoId);
  if (error) throw error;
}

export async function createOFRemote(
  projetoId: number,
  nomeOf: string,
  numeroOf: string,
  prazoLimite?: string | null
): Promise<OrdemFabrico> {
  const insertPayload: any = { projeto_id: projetoId, nome_of: nomeOf, numero_of: numeroOf };
  if (prazoLimite) insertPayload.prazo_limite = prazoLimite;

  const { data: newOfData, error: insertError } = await supabase
    .from('ordens_fabrico')
    .insert([insertPayload])
    .select()
    .single();

  if (insertError || !newOfData) throw new Error(insertError?.message || 'Error creating OF');

  const predefinedTasks = [
    { ordem_id: newOfData.id, nome_tarefa: 'Modelação',                ordem_index: 0 },
    { ordem_id: newOfData.id, nome_tarefa: 'Aprovisionamento Material', ordem_index: 1 },
    { ordem_id: newOfData.id, nome_tarefa: 'Validação',                 ordem_index: 2 },
    { ordem_id: newOfData.id, nome_tarefa: 'Fabrico',                   ordem_index: 3 },
    { ordem_id: newOfData.id, nome_tarefa: 'Parafusaria',               ordem_index: 4 },
    { ordem_id: newOfData.id, nome_tarefa: 'Montagem',                   ordem_index: 5 },
  ];

  const { error: tasksError } = await supabase.from('tarefas').insert(predefinedTasks);
  if (tasksError) throw tasksError;

  return newOfData as OrdemFabrico;
}

export async function createProjetoRemote(nome: string, cliente: string): Promise<Projeto> {
  const refCode = nome.split(' ')[0];
  const { data: existing } = await supabase
    .from('projectos')
    .select('*')
    .ilike('nome', `${refCode}%`)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.arquivado) {
      const { data: restored, error: rErr } = await supabase
        .from('projectos')
        .update({ arquivado: false, ultimo_movimento: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (rErr) throw rErr;
      return restored as Projeto;
    } else {
      throw new Error(`A Obra "${existing.nome}" já se encontra na lista de Projetos Ativos!`);
    }
  }

  const { data, error } = await supabase
    .from('projectos')
    .insert([{ nome, cliente }])
    .select()
    .single();
  if (error) throw error;
  return data as Projeto;
}

export async function arquivarProjetoRemote(id: number) {
  // Apenas arquiva o projeto — OFs e tarefas são preservadas para consulta futura
  const { error: projError } = await supabase
    .from('projectos')
    .update({ arquivado: true })
    .eq('id', id);
  if (projError) throw projError;
}

export async function deleteProjetoRemote(id: number) {
  const { error } = await supabase.from('projectos').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteOrdemFabricoRemote(id: number) {
  const { error } = await supabase.from('ordens_fabrico').delete().eq('id', id);
  if (error) throw error;
}

export async function createTarefaRemote(ordemId: number, nomeTarefa: string, index: number): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .insert([{ ordem_id: ordemId, nome_tarefa: nomeTarefa, ordem_index: index }])
    .select()
    .single();
  if (error) throw error;
  return data as Tarefa;
}

export async function updateOrdemFabricoRemote(ofId: number, fields: { nome_of?: string; numero_of?: string; notas?: string; prazo_limite?: string | null }) {
  const { error } = await supabase.from('ordens_fabrico').update(fields).eq('id', ofId);
  if (error) throw error;
}

export async function updateTarefaRemote(tarefaId: number, nomeTarefa: string) {
  const { error } = await supabase.from('tarefas').update({ nome_tarefa: nomeTarefa }).eq('id', tarefaId);
  if (error) throw error;
}

export async function deleteTarefaRemote(tarefaId: number) {
  const { error } = await supabase.from('tarefas').delete().eq('id', tarefaId);
  if (error) throw error;
}

export async function reorderTarefasRemote(tarefas: { id: number; ordem_index: number }[]) {
  // Batch update via Promise.all
  await Promise.all(
    tarefas.map(t =>
      supabase.from('tarefas').update({ ordem_index: t.ordem_index }).eq('id', t.id)
    )
  );
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-ARCHIVE (apenas online)
// ─────────────────────────────────────────────────────────────────

export async function runAutoArchive() {
  if (!isOnline()) return; // salta quando offline
  const { data: activeProjs } = await supabase
    .from('projectos')
    .select('id, ultimo_movimento')
    .eq('arquivado', false);
  if (!activeProjs) return;

  const now = Date.now();
  const SevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  for (const p of activeProjs) {
    const dt = new Date(p.ultimo_movimento || '2000-01-01').getTime();
    if (now - dt > SevenDaysMs) {
      const { data: ofs } = await supabase
        .from('ordens_fabrico')
        .select('id, tarefas(concluido)')
        .eq('projeto_id', p.id);
      if (ofs && ofs.length > 0) {
        let allFinished = true;
        for (const o of ofs) {
          const total = o.tarefas?.length || 0;
          const concluidas = o.tarefas?.filter((t: any) => t.concluido).length || 0;
          if (total === 0 || concluidas < total) { allFinished = false; break; }
        }
        if (allFinished) {
          console.log(`Auto-Archiving project ${p.id}`);
          await supabase.from('projectos').update({ arquivado: true }).eq('id', p.id);
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  Helper para verificar quantas mutações estão pendentes
// ─────────────────────────────────────────────────────────────────
export async function getPendingCount(): Promise<number> {
  const q = await readPending();
  return q.length;
}
