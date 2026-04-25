import { supabase } from '../supabaseClient';
import { isOnline, readCache, patchCache } from './offlineCache';
import { Projeto } from './types';

export async function fetchProjetos(): Promise<Projeto[]> {
  if (isOnline()) {
    const { data, error } = await supabase
      .from('projectos')
      .select('*')
      .or('arquivado.eq.false,arquivado.is.null')
      .order('ordem_index', { ascending: true });
    if (error) throw error;
    const projetos = data as Projeto[];
    await patchCache({ projetos });
    return projetos;
  } else {
    const cache = await readCache();
    return cache.projetos || [];
  }
}

export async function fetchProjectById(id: number): Promise<Projeto | null> {
  if (isOnline()) {
    const { data, error } = await supabase.from('projectos').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Projeto;
  } else {
    const cache = await readCache();
    const all = [...(cache.projetos || []), ...(cache.projetoArquivados || [])];
    return all.find(p => p.id === id) || null;
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

export async function createProjetoRemote(nome: string, cliente: string, userId?: string): Promise<Projeto> {
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

  const insertData: any = { nome, cliente };
  if (userId) insertData.user_id = userId;

  const { data, error } = await supabase
    .from('projectos')
    .insert([insertData])
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
}

export async function deleteProjetoRemote(id: number) {
  const { error } = await supabase.from('projectos').delete().eq('id', id);
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

export async function updateProjetoRemote(projetoId: number, fields: { anexo_url?: string | null }) {
  const { error } = await supabase
    .from('projectos')
    .update(fields)
    .eq('id', projetoId);
  if (error) throw error;
}

export async function reorderProjetosRemote(projetos: { id: number; ordem_index: number }[]) {
  const { error } = await supabase.rpc('reorder_items', {
    table_name: 'projectos',
    updates: projetos
  });
  if (error) throw error;
}
