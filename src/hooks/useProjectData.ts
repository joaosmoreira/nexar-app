import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  fetchProjectById, fetchOfsByProjeto, getCachedProjectDetails, 
  Projeto, OrdemFabrico 
} from '../services/api';

export interface OFWithProgress extends OrdemFabrico {
  progress: number;
}

export function useProjectData(projetoId: number) {
  const dataVersion = useAppStore(state => state.dataVersion);
  const projects = useAppStore(state => state.projects);
  
  const cachedProject = useMemo(() => projects.find(p => p.id === projetoId), [projects, projetoId]);

  const [projeto, setProjeto] = useState<Projeto | null>(cachedProject || null);
  const [ofs, setOfs] = useState<OFWithProgress[]>([]);
  const [loading, setLoading] = useState(!cachedProject);
  const [notas, setNotas] = useState(cachedProject?.informacoes_gerais || "");
  const [initialNotas, setInitialNotas] = useState(cachedProject?.informacoes_gerais || "");

  const formatOfs = (rawOfData: OrdemFabrico[]) => {
    const formatted = rawOfData.map((d: any) => {
      const total = d.tarefas?.length || 1;
      const concluidas = d.tarefas?.filter((t: any) => t.concluido).length || 0;
      return {
        ...d,
        progress: Math.round((concluidas / total) * 100)
      };
    });

    formatted.sort((a: any, b: any) => {
      const aDone = a.progress === 100 ? 1 : 0;
      const bDone = b.progress === 100 ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
    });

    return formatted;
  };

  const loadData = async () => {
    if (!projeto) {
      const cached = await getCachedProjectDetails(projetoId);
      if (cached.projeto) {
        setProjeto(cached.projeto);
        setNotas(cached.projeto.informacoes_gerais || "");
        setInitialNotas(cached.projeto.informacoes_gerais || "");
        setOfs(formatOfs(cached.ofs));
        setLoading(false);
      }
    }
    
    try {
      const [projRes, ofsRes] = await Promise.all([
        fetchProjectById(projetoId),
        fetchOfsByProjeto(projetoId)
      ]);

      if (projRes) {
        setProjeto(projRes);
        setNotas(projRes.informacoes_gerais || "");
        setInitialNotas(projRes.informacoes_gerais || "");
      }
      if (ofsRes) setOfs(formatOfs(ofsRes));
    } catch (e) {
      console.error("Erro ao carregar projeto:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cachedProject) {
      setProjeto(cachedProject);
      setNotas(cachedProject.informacoes_gerais || "");
      setInitialNotas(cachedProject.informacoes_gerais || "");
      setLoading(false);
    }
    loadData();
  }, [projetoId, dataVersion]);

  return { projeto, ofs, loading, notas, setNotas, initialNotas, setInitialNotas, loadData };
}
