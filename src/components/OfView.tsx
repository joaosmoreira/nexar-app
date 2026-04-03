import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { fetchTarefasByOf, toggleTarefaConcluida, createTarefa, deleteOrdemFabrico, updateProjectoUltimoMovimento, OrdemFabrico, Tarefa } from '../services/api';
import { exportToExcel, exportToJson } from '../lib/exportUtils';
import { FileDown, CheckCircle2, Circle, Settings2, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Modal } from './Modal';

export function OfView({ ofId }: { ofId: number }) {
  const [ofData, setOfData] = useState<OrdemFabrico | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInputName, setDeleteInputName] = useState("");

  const loadData = async () => {
    setLoading(true);
    // Fetch OF with Project attached for title
    const { data: oData } = await supabase
      .from('ordens_fabrico')
      .select('*, projectos(nome)')
      .eq('id', ofId)
      .single();

    if (oData) {
      setOfData(oData as OrdemFabrico);
      setProjectName((oData as any).projectos?.nome || "");
    }

    const tData = await fetchTarefasByOf(ofId);
    setTarefas(tData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [ofId]);

  const handleToggle = async (t: Tarefa) => {
    // Optimistic update
    setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: !t.concluido } : task));
    try {
      await toggleTarefaConcluida(t.id, !t.concluido);
      if (ofData?.projeto_id) {
         updateProjectoUltimoMovimento(ofData.projeto_id).catch(()=>null);
      }
    } catch {
      // Revert if error
      setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: t.concluido } : task));
    }
  };

  const onExportJson = () => {
    const exportData = tarefas.map(t => ({ Tarefa: t.nome_tarefa, Status: t.concluido ? 'Concluída' : 'Pendente' }));
    exportToJson(exportData, `tarefas_${ofData?.numero_of}`);
  };

  const onExportExcel = () => {
    const exportData = tarefas.map(t => ({ Tarefa: t.nome_tarefa, Status: t.concluido ? 'Concluída' : 'Pendente' }));
    exportToExcel(exportData, `tarefas_${ofData?.numero_of}`);
  };

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName) return;
    try {
      const novaTarefa = await createTarefa(ofId, newTaskName, tarefas.length);
      setTarefas([...tarefas, novaTarefa]);
      setModalOpen(false);
      setNewTaskName("");
    } catch (e: any) {
      alert("Erro ao adicionar tarefa: " + e.message);
    }
  };

  const handleApagar = () => {
    setDeleteModalOpen(true);
    setDeleteInputName("");
  }

  const confirmApagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofData) return;
    if(deleteInputName === ofData.numero_of) {
      try {
        await deleteOrdemFabrico(ofId);
        useAppStore.getState().setSelectedOf(null);
      } catch(e:any) { alert(e.message) }
    } else {
       alert("O número inserido não corresponde com o da O.F. atual.");
    }
  }

  if (loading) return <div className="p-8 text-slate-400">A carregar detalhes da OF...</div>;
  if (!ofData) return <div className="p-8 text-slate-400">Ordem de Fabrico não encontrada.</div>;

  const progresso = Math.round((tarefas.filter(t => t.concluido).length / (tarefas.length || 1)) * 100);

  return (
    <div className="p-8 h-full overflow-auto relative">
      <Modal isOpen={deleteModalOpen} title="Apagar Ordem de Fabrico" onClose={() => setDeleteModalOpen(false)}>
        <form onSubmit={confirmApagar} className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
            <span className="font-bold">Segurança:</span> De certeza que deseja apagar a O.F.? Todas as ferramentas e passos serão anulados.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Para confirmar, escreva o número da OF: <strong className="text-slate-200">"{ofData.numero_of}"</strong></label>
            <input 
              autoFocus
              type="text" 
              required
              value={deleteInputName}
              onChange={e => setDeleteInputName(e.target.value)}
              placeholder="Escreva número..."
              className="w-full bg-slate-950 border border-red-900/50 text-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
            />
          </div>
          <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg p-3 transition-colors">
             Confirmar Eliminação Desta OF
          </button>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} title="Nova Tarefa" onClose={() => setModalOpen(false)}>
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Passo a executar</label>
            <input 
              autoFocus
              type="text" 
              required
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              placeholder="ex: Rever acabamentos"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <button type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg p-3 transition-colors">
            Adicionar Passo
          </button>
        </form>
      </Modal>

      {/* BREADCRUMB / HEADER */}
      <div className="mb-8">
        <div className="flex items-center text-xs font-medium tracking-widest uppercase mb-2">
          <button 
            onClick={() => useAppStore.getState().setSelectedOf(null)}
            className="text-slate-400 hover:text-sky-400 transition-colors cursor-pointer outline-none"
          >
             {projectName || "PROJETO"}
          </button>
          <span className="text-slate-700 mx-2">/</span>
          <span className="text-sky-400">O.F. {ofData.numero_of}</span>
        </div>
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Settings2 className="text-sky-500" />
            {ofData.nome_of}
          </h2>
          <div className="flex gap-2">
            <button onClick={handleApagar} className="flex items-center gap-2 px-3 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 text-sm font-medium rounded-lg transition-colors border border-red-500/20">
              <Trash2 size={16} /> Apagar O.F.
            </button>
            <div className="w-px bg-slate-700/50 mx-2" />
            <button onClick={onExportJson} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 rounded-lg transition-colors">
              <FileDown size={16} /> JSON
            </button>
            <button onClick={onExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium rounded-lg transition-colors">
              <FileDown size={16} /> EXCEL
            </button>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl mb-8">
        <div className="flex justify-between items-end mb-3">
          <div className="text-sm font-medium text-slate-300">Progresso Operacional</div>
          <div className="text-xl font-bold text-sky-400">{progresso}%</div>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 flex items-center overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-1000 ease-out" 
            style={{ width: `${progresso}%` }}
          ></div>
        </div>
      </div>

      {/* TAREFAS LIST */}
      <div className="space-y-3 max-w-4xl">
        <h3 className="text-lg font-medium text-slate-200 mb-4 px-1">Checklist de Tarefas</h3>
        
        {tarefas.map((tarefa) => (
          <div 
            key={tarefa.id}
            onClick={() => handleToggle(tarefa)}
            className={cn(
              "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer",
              tarefa.concluido 
                ? "bg-emerald-500/5 border-emerald-500/20" 
                : "bg-slate-900 border-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex-shrink-0">
              {tarefa.concluido ? (
                <CheckCircle2 className="text-emerald-500 w-6 h-6 transition-transform group-hover:scale-110" />
              ) : (
                <Circle className="text-slate-500 w-6 h-6 transition-transform group-hover:scale-110" />
              )}
            </div>
            
            <span className={cn(
              "text-lg transition-all",
              tarefa.concluido ? "text-emerald-500/70 line-through" : "text-slate-200"
            )}>
              {tarefa.nome_tarefa}
            </span>
          </div>
        ))}

        {tarefas.length === 0 && (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500">
            Sem tarefas registadas.
          </div>
        )}

        <button 
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all"
        >
          <Plus size={18} />
          <span>Adicionar Tarefa Personalizada</span>
        </button>
      </div>
    </div>
  );
}
