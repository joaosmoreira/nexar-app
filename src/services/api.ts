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
  tarefas?: { concluido: boolean }[];
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

export async function createOF(projetoId: number, nomeOf: string, numeroOf: string): Promise<OrdemFabrico> {
  if (isOnline()) {
    return createOFRemote(projetoId, nomeOf, numeroOf);
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
      tarefas: predefinedTasks.map(t => ({ concluido: t.concluido })),
    };

    const cache = await readCache();
    const ofsByProjeto = { ...(cache.ofsByProjeto || {}) };
    ofsByProjeto[projetoId] = [newOf, ...(ofsByProjeto[projetoId] || [])];
    const tarefasByOf = { ...(cache.tarefasByOf || {}), [tempId]: predefinedTasks };
    await patchCache({ ofsByProjeto, tarefasByOf });
    await queueMutation({ action: 'createOF', tempId, projetoId, nomeOf, numeroOf });
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

export async function updateOrdemFabrico(ofId: number, fields: { nome_of?: string; numero_of?: string }) {
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

export async function createOFRemote(projetoId: number, nomeOf: string, numeroOf: string): Promise<OrdemFabrico> {
  const { data: newOfData, error: insertError } = await supabase
    .from('ordens_fabrico')
    .insert([{ projeto_id: projetoId, nome_of: nomeOf, numero_of: numeroOf }])
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
  const { error: projError } = await supabase
    .from('projectos')
    .update({ arquivado: true })
    .eq('id', id);
  if (projError) throw projError;
  const { data: ofs } = await supabase.from('ordens_fabrico').select('id').eq('projeto_id', id);
  if (ofs && ofs.length > 0) {
    const ofIds = ofs.map((o: any) => o.id);
    await supabase.from('tarefas').delete().in('ordem_id', ofIds);
  }
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

export async function updateOrdemFabricoRemote(ofId: number, fields: { nome_of?: string; numero_of?: string }) {
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
