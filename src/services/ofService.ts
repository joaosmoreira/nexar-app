import { supabase } from '../supabaseClient';
import { isOnline, readCache, patchCache } from './offlineCache';
import { OrdemFabrico } from './types';

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

export async function deleteOrdemFabricoRemote(id: number) {
  const { error } = await supabase.from('ordens_fabrico').delete().eq('id', id);
  if (error) throw error;
}

export async function updateOrdemFabricoRemote(ofId: number, fields: { nome_of?: string; numero_of?: string; notas?: string; prazo_limite?: string | null }) {
  const { error } = await supabase.from('ordens_fabrico').update(fields).eq('id', ofId);
  if (error) throw error;
}

export async function reorderTarefasRemote(tarefas: { id: number; ordem_index: number }[]) {
  const { error } = await supabase.rpc('reorder_items', {
    table_name: 'tarefas',
    items: tarefas
  });
  if (error) throw error;
}

export async function fetchNextGs0000OfNumber(projetoId: number): Promise<string> {
  if (isOnline()) {
    const { data } = await supabase
      .from('ordens_fabrico')
      .select('numero_of')
      .eq('projeto_id', projetoId)
      .order('numero_of', { ascending: false });

    if (!data || data.length === 0) return '00000001';

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
