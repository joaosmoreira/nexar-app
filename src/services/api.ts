import { supabase } from '../supabaseClient';

export interface Projeto {
  id: number;
  nome: string;
  cliente: string;
  criado_em: string;
  arquivado?: boolean;
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

export async function fetchProjetos() {
  const { data, error } = await supabase
    .from('projectos')
    .select('*')
    .or('arquivado.eq.false,arquivado.is.null')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Projeto[];
}

export async function fetchOfsByProjeto(projetoId: number) {
  const { data, error } = await supabase
    .from('ordens_fabrico')
    .select('*, tarefas(*)')
    .eq('projeto_id', projetoId)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as OrdemFabrico[];
}

export async function fetchTarefasByOf(ofId: number) {
  const { data, error } = await supabase
    .from('tarefas')
    .select('*')
    .eq('ordem_id', ofId)
    .order('ordem_index', { ascending: true });
  if (error) throw error;
  return data as Tarefa[];
}

export async function toggleTarefaConcluida(tarefaId: number, concluido: boolean) {
  const { error } = await supabase
    .from('tarefas')
    .update({ concluido })
    .eq('id', tarefaId);
  if (error) throw error;
}

export async function updateProjectoUltimoMovimento(projetoId: number) {
  const { error } = await supabase
    .from('projectos')
    .update({ ultimo_movimento: new Date().toISOString() })
    .eq('id', projetoId);
  if (error) throw error;
}

export async function createOF(projetoId: number, nomeOf: string, numeroOf: string) {
  // Insert the OF
  const { data: newOfData, error: insertError } = await supabase
    .from('ordens_fabrico')
    .insert([{ projeto_id: projetoId, nome_of: nomeOf, numero_of: numeroOf }])
    .select()
    .single();

  if (insertError || !newOfData) throw new Error(insertError?.message || 'Error creating OF');

  // Generate the 6 tasks
  const predefinedTasks = [
    { ordem_id: newOfData.id, nome_tarefa: 'Modelação', ordem_index: 0 },
    { ordem_id: newOfData.id, nome_tarefa: 'Aprovisionamento Material', ordem_index: 1 },
    { ordem_id: newOfData.id, nome_tarefa: 'Validação', ordem_index: 2 },
    { ordem_id: newOfData.id, nome_tarefa: 'Fabrico', ordem_index: 3 },
    { ordem_id: newOfData.id, nome_tarefa: 'Parafusaria', ordem_index: 4 },
    { ordem_id: newOfData.id, nome_tarefa: 'Montagem', ordem_index: 5 }
  ];

  const { error: tasksError } = await supabase.from('tarefas').insert(predefinedTasks);
  
  if (tasksError) throw tasksError;

  return newOfData as OrdemFabrico;
}

// Create a real project
export async function createProjeto(nome: string, cliente: string) {
  // Check if reference already exists to restore from archive if necessary
  const refCode = nome.split(" ")[0]; 
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

export async function runAutoArchive() {
  const { data: activeProjs } = await supabase.from('projectos').select('id, ultimo_movimento').eq('arquivado', false);
  if (!activeProjs) return;

  const now = Date.now();
  const SevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  for (const p of activeProjs) {
     const dt = new Date(p.ultimo_movimento || "2000-01-01").getTime();
     if ((now - dt) > SevenDaysMs) {
        // Validate if ALL tasks are 100% completed
        const { data: ofs } = await supabase.from('ordens_fabrico').select('id, tarefas(concluido)').eq('projeto_id', p.id);
        if (ofs && ofs.length > 0) {
           let allFinished = true;
           for (const o of ofs) {
              const total = o.tarefas?.length || 0;
              const concluidas = o.tarefas?.filter((t: any) => t.concluido).length || 0;
              if (total === 0 || concluidas < total) { allFinished = false; break; }
           }
           if (allFinished) {
              // Archive silently
              console.log(`Auto-Archiving project ${p.id} due to 100% completion & 7 day age.`);
              await supabase.from('projectos').update({ arquivado: true }).eq('id', p.id);
           }
        }
     }
  }
}

export async function createTarefa(ordemId: number, nomeTarefa: string, index: number) {
  const { data, error } = await supabase
    .from('tarefas')
    .insert([{ ordem_id: ordemId, nome_tarefa: nomeTarefa, ordem_index: index }])
    .select()
    .single();
    
  if (error) throw error;
  return data as Tarefa;
}

// Helper to create a dummy project for testing without backend easily
export async function createDummyProject(nome: string, cliente: string) {
  const { data, error } = await supabase
    .from('projectos')
    .insert([{ nome, cliente }])
    .select()
    .single();
    
  if (error) throw error;
  return data as Projeto;
}

// DELETE Funções
export async function deleteProjeto(id: number) {
  const { error } = await supabase.from('projectos').delete().eq('id', id);
  if (error) throw error;
}

export async function arquivarProjeto(id: number) {
  const { error: projError } = await supabase.from('projectos').update({ arquivado: true }).eq('id', id);
  if (projError) throw projError;
  const { data: ofs } = await supabase.from('ordens_fabrico').select('id').eq('projeto_id', id);
  if (ofs && ofs.length > 0) {
     const ofIds = ofs.map((o:any) => o.id);
     await supabase.from('tarefas').delete().in('ordem_id', ofIds);
  }
}

export async function fetchProjetosArquivados() {
  const { data, error } = await supabase
    .from('projectos')
    .select('*')
    .eq('arquivado', true)
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return data as Projeto[];
}

export async function deleteOrdemFabrico(id: number) {
  const { error } = await supabase.from('ordens_fabrico').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDashboardMetrics(isArchiveMode: boolean) {
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
}
