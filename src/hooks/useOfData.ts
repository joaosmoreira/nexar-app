import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAppStore } from '../store/useAppStore';
import { fetchTarefasByOf, OrdemFabrico, Tarefa } from '../services/api';

export function useOfData(ofId: number) {
  const dataVersion = useAppStore(state => state.dataVersion);
  const cachedOf = useAppStore(state => state.ofs.find(o => o.id === ofId));
  const cachedProject = useAppStore(state => state.projects.find(p => p.id === cachedOf?.projeto_id));

  const [ofData, setOfData] = useState<OrdemFabrico | null>(cachedOf || null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(!cachedOf);
  const [projectName, setProjectName] = useState(cachedProject?.nome || '');
  const [notas, setNotas] = useState(cachedOf?.notas || '');
  const [initialNotas, setInitialNotas] = useState(cachedOf?.notas || '');
  const [prazoLimite, setPrazoLimite] = useState<string | null>(cachedOf?.prazo_limite || null);

  const loadData = async (silent = false) => {
    if (!silent && !ofData) setLoading(true);
    const { data: oData } = await supabase
      .from('ordens_fabrico')
      .select('*, projectos(nome)')
      .eq('id', ofId)
      .single();
    if (oData) { 
      setOfData(oData as OrdemFabrico); 
      setProjectName((oData as any).projectos?.nome || ''); 
      setNotas((oData as any).notas || '');
      setInitialNotas((oData as any).notas || '');
      setPrazoLimite((oData as any).prazo_limite || null);
    }
    const tData = await fetchTarefasByOf(ofId);
    setTarefas(tData);
    setLoading(false);
  };

  const firstLoad = useRef(true);
  const previousOfId = useRef(ofId);

  useEffect(() => { 
    if (cachedOf) {
      setOfData(cachedOf);
      setNotas(cachedOf.notas || '');
      setInitialNotas(cachedOf.notas || '');
      setPrazoLimite(cachedOf.prazo_limite || null);
      if (cachedProject) setProjectName(cachedProject.nome);
    }
    const isSilent = previousOfId.current === ofId && !firstLoad.current;
    loadData(isSilent);
    firstLoad.current = false;
    previousOfId.current = ofId;
  }, [ofId, dataVersion]);

  return { 
    ofData, setOfData, tarefas, setTarefas, loading, 
    projectName, setProjectName, notas, setNotas, 
    initialNotas, setInitialNotas, prazoLimite, setPrazoLimite, loadData 
  };
}
