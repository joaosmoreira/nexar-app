import { supabase } from '../supabaseClient';
import { isOnline, readCache, patchCache } from './offlineCache';
import { Tarefa } from './types';

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

export async function createTarefaRemote(ordemId: number, nomeTarefa: string, index: number): Promise<Tarefa> {
  const { data, error } = await supabase
    .from('tarefas')
    .insert([{ ordem_id: ordemId, nome_tarefa: nomeTarefa, ordem_index: index }])
    .select()
    .single();
  if (error) throw error;
  return data as Tarefa;
}

export async function toggleTarefaConcluidaRemote(tarefaId: number, concluido: boolean) {
  const { error } = await supabase.from('tarefas').update({ concluido }).eq('id', tarefaId);
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
