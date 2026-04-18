import { supabase } from '../supabaseClient';
import { isOnline, readCache } from './offlineCache';
import { OrdemFabrico, Projeto, Tarefa } from './types';

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

export async function fetchAlertOFs(limit = 6): Promise<OrdemFabrico[]> {
  const isOpenOf = (of: any) => {
    const total = of.tarefas?.length || 0;
    if (total === 0) return true;
    return of.tarefas.filter((t: any) => t.concluido).length < total;
  };

  if (isOnline()) {
    const { data, error } = await supabase
      .from('ordens_fabrico')
      .select('id, numero_of, nome_of, status, criado_em, prazo_limite, projeto_id, tarefas(concluido), projectos(nome)')
      .order('criado_em', { ascending: true })
      .limit(100);

    if (error) throw error;

    const open: OrdemFabrico[] = (data || []).map((of: any) => ({
      ...of,
      status: of.status || 'em_progresso',
      progress: of.tarefas ? Math.round((of.tarefas.filter((t: any) => t.concluido).length / of.tarefas.length) * 100) : 0,
      tarefas: (of.tarefas || []).map((t: any) => ({
        id: 0,
        ordem_id: of.id,
        nome_tarefa: '',
        concluido: !!t.concluido,
        ordem_index: 0
      })) as Tarefa[]
    })).filter(isOpenOf);

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const urgent = open.filter((of: any) => {
      if (!of.prazo_limite) return false;
      const diff = new Date(of.prazo_limite).getTime() - now;
      return diff >= 0 && diff <= sevenDaysMs;
    }).sort((a: any, b: any) =>
      new Date(a.prazo_limite).getTime() - new Date(b.prazo_limite).getTime()
    );

    const urgentIds = new Set(urgent.map((of: any) => of.id));
    const oldest = open.filter((of: any) => !urgentIds.has(of.id));

    return [...urgent, ...oldest].slice(0, limit);
  } else {
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

  return (data || [])
    .filter((of: any) => {
      const total = of.tarefas?.length || 0;
      if (total === 0) return true;
      return of.tarefas.filter((t: any) => t.concluido).length < total;
    })
    .map((of: any) => ({ projeto_id: of.projeto_id, prazo_limite: of.prazo_limite }));
}

export async function fetchProjectsCompletionStatus(): Promise<number[]> {
  if (!isOnline()) return [];
  const { data, error } = await supabase
    .from('ordens_fabrico')
    .select('projeto_id, tarefas(concluido)');

  if (error || !data) return [];

  const byProject = new Map<number, boolean>();
  for (const of_ of data as any[]) {
    const projId = of_.projeto_id;
    const total = of_.tarefas?.length || 0;
    const allDone = total > 0 && (of_.tarefas as any[]).every((t: any) => t.concluido);
    const prev = byProject.get(projId);
    if (prev === undefined) {
      byProject.set(projId, allDone);
    } else {
      if (!allDone) byProject.set(projId, false);
    }
  }

  return [...byProject.entries()]
    .filter(([, done]) => done)
    .map(([id]) => id);
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
