import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchProjetos, fetchOfsByProjeto, createProjeto, fetchProjetosArquivados, Projeto, OrdemFabrico } from '../services/api';
import { Folder, FileCog, Layers, Plus, Archive, AlertTriangle, CheckCircle2, Search, LogOut, User, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { toast } from 'sonner';

function ProjectItem({ projeto }: { projeto: Projeto }) {
  const { selectedProjectId, selectedOfId, setSelectedProject } = useAppStore();
  const [ofs, setOfs] = useState<OrdemFabrico[]>([]);
  const [loading, setLoading] = useState(false);

  const isSelected = selectedProjectId === projeto.id && selectedOfId === null;
  const isExpanded = selectedProjectId === projeto.id;

  // Carrega OFs apenas se expandido
  useEffect(() => {
    if (isExpanded) {
      setLoading(true);
      fetchOfsByProjeto(projeto.id).then(data => {
        const formatted = data.map((d: any) => {
          const total = d.tarefas?.length || 1;
          const concluidas = d.tarefas?.filter((t: any) => t.concluido).length || 0;
          return { ...d, progress: Math.round((concluidas / total) * 100) };
        });

        formatted.sort((a: any, b: any) => {
           const aDone = a.progress === 100 ? 1 : 0;
           const bDone = b.progress === 100 ? 1 : 0;
           if (aDone !== bDone) return aDone - bDone;
           // Both open/closed. Order oldest first (first to be created is prioritized)
           return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
        });

        setOfs(formatted);
        setLoading(false);
      });
    }
  }, [isExpanded, projeto.id]);

  const [ref, ...rest] = projeto.nome.split(" - ");
  const projNameOnly = rest.length > 0 ? rest.join(" - ") : (projeto.cliente || projeto.nome);

  return (
    <div className="mb-2">
      <button
        onClick={() => setSelectedProject(projeto.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
          isSelected ? "bg-slate-800 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
        )}
      >
        <Folder size={18} className={cn("shrink-0 transition-colors", isSelected ? "text-sky-400" : "text-sky-500/50")} />
        <div className="flex-1 text-left truncate">
           <div className="text-[10px] font-bold tracking-widest uppercase text-sky-500/70 mb-0.5">{ref}</div>
           <div className="text-[13px] font-medium leading-tight truncate text-slate-300 group-hover:text-slate-100 transition-colors">{projNameOnly}</div>
        </div>
      </button>

      {isExpanded && (
        <div className="ml-[22px] mt-1 pl-3 border-l border-slate-800 overflow-hidden space-y-1">
          {loading ? (
            <div className="text-xs text-slate-500 px-3 py-1">A carregar...</div>
          ) : ofs.length === 0 ? (
            <div className="text-xs text-slate-500 px-3 py-1">Sem ordens de fabrico</div>
          ) : (
            ofs.map((of) => (
              <OfItem key={of.id} ofData={of} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OfItem({ ofData }: { ofData: OrdemFabrico }) {
  const { selectedOfId, setSelectedOf } = useAppStore();
  const isSelected = selectedOfId === ofData.id;

  const progresso = ofData.tarefas && ofData.tarefas.length > 0 
    ? (ofData.tarefas.filter(t => t.concluido).length / ofData.tarefas.length) * 100 
    : 0;

  const ageMs = Date.now() - new Date(ofData.criado_em).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  let iconToRender;
  if (progresso >= 100) {
     iconToRender = <CheckCircle2 size={16} className="text-emerald-500" />;
  } else if (ageDays > 21) {
     iconToRender = <AlertTriangle size={16} className="text-red-500" />;
  } else if (ageDays > 14) {
     iconToRender = <AlertTriangle size={16} className="text-amber-500" />;
  } else {
     iconToRender = <FileCog size={16} className={cn("transition-colors", isSelected ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400/50")} />;
  }

  return (
    <button
      onClick={() => setSelectedOf(ofData.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
        isSelected ? "bg-slate-800 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
      )}
    >
      <div className="relative shrink-0 flex items-center">
         {iconToRender}
      </div>

      <div className="flex-1 text-left truncate">
         <div className={cn("font-medium text-[12px] truncate", isSelected ? "text-white" : "text-slate-300 group-hover:text-white transition-colors")}>
            {ofData.numero_of}
         </div>
         <div className="text-[10px] uppercase tracking-wider opacity-60 truncate text-slate-400">{ofData.nome_of}</div>
      </div>
    </button>
  );
}

export function Sidebar() {
  const { isArchiveMode, setArchiveMode, user, isOnline, isSyncing, lastSyncAt, hasPendingMutations, dataVersion } = useAppStore();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjetos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = isArchiveMode ? await fetchProjetosArquivados() : await fetchProjetos();
      setProjetos(data);
      // Atualizar a última data de sincronização visual
      useAppStore.getState().setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    loadProjetos(false);

    // Ciclo de sincronização automática de 60 em 60 segundos
    const syncInterval = setInterval(() => {
      const store = useAppStore.getState();
      // Só faz auto-refresh se estivermos com internet e sem alterações pendentes prioritárias
      if (store.isOnline && !store.hasPendingMutations) {
        store.setSyncing(true);
        loadProjetos(true).finally(() => {
           store.setSyncing(false);
        });
      }
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [isArchiveMode, dataVersion]); 

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('nexar-sidebar-width');
    return saved ? Math.max(288, parseInt(saved, 10)) : 288;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 288) newWidth = 288;
      if (newWidth > 600) newWidth = 600;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('nexar-sidebar-width', width.toString());
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, width]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newProjRef, setNewProjRef] = useState("");
  const [newProjCli, setNewProjCli] = useState("");

  const handleCreateProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjRef) return;
    try {
      const formattedRef = `GS${newProjRef}`;
      await createProjeto(formattedRef, newProjCli.trim() === "" ? "Desconhecido" : newProjCli);
      await loadProjetos();
      setModalOpen(false);
      setNewProjRef("");
      setNewProjCli("");
      useAppStore.getState().incrementDataVersion();
      toast.success("Projeto criado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao criar projeto: " + e.message);
    }
  };

  return (
    <aside 
      style={{ width: `${width}px` }}
      className="bg-slate-900 border-r border-slate-800 flex flex-col h-full relative shrink-0 transition-all duration-0"
    >
      <div 
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
        className={cn(
          "absolute top-0 right-[-3px] w-1.5 h-full cursor-col-resize z-50 transition-colors",
          isResizing ? "bg-sky-500" : "hover:bg-sky-500/50"
        )}
      />

      <Modal isOpen={modalOpen} title="Novo Projeto" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleCreateProjeto} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Referência</label>
            <div className="flex w-full items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden transition-all focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
               <span className="bg-slate-900 border-r border-slate-800 text-slate-500 font-bold px-3 py-2.5 select-none">
                 GS
               </span>
               <input 
                 autoFocus
                 type="text" 
                 required
                 placeholder="1522"
                 value={newProjRef}
                 onChange={e => setNewProjRef(e.target.value.replace(/[^0-9]/g, ''))}
                 className="flex-1 bg-transparent text-slate-200 p-2.5 outline-none"
               />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Cliente (Opcional)</label>
            <input 
              type="text" 
              value={newProjCli}
              onChange={e => setNewProjCli(e.target.value)}
              placeholder="ex: Garsteel"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <button type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-medium rounded-lg p-3 transition-all duration-150">
            Adicionar Projeto
          </button>
        </form>
      </Modal>

      {/* HEADER da Sidebar - HUB */}
      <button 
        onClick={() => { setArchiveMode(false); useAppStore.getState().setSelectedProject(null); }}
        className="p-4 border-b border-slate-800 flex items-center gap-3 w-full text-left hover:bg-slate-800/30 active:scale-[0.98] transition-all duration-150 group cursor-pointer shrink-0"
        title="Voltar ao HUB Global"
      >
        <div className="w-8 h-8 rounded bg-sky-500/10 flex items-center justify-center border border-sky-500/20 group-hover:bg-sky-500/20 transition-colors">
          <Layers className="text-sky-400 group-hover:text-sky-300" size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white transition-colors">Nexar HUB</h1>
          <p className="text-[10px] text-sky-500/70 group-hover:text-sky-400 uppercase tracking-wider font-medium transition-colors">Ir para o HUB Principal</p>
        </div>
      </button>

      {/* Global Search Bar Trigger */}
      <div className="px-4 py-3 border-b border-slate-800 shrink-0">
        <button 
           onClick={() => useAppStore.getState().setSearchOpen(true)}
           className="w-full flex items-center gap-2 bg-slate-950 border border-slate-800 hover:border-sky-500/50 active:scale-[0.98] transition-all text-slate-400 hover:text-slate-200 rounded-lg p-2.5 text-sm outline-none group"
        >
          <Search size={16} className="group-hover:text-sky-400 transition-colors shrink-0" />
          <span className="flex-1 text-left text-[13px]">Pesquisa...</span>
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium tracking-widest shrink-0 hidden lg:block">CMD+K</span>
        </button>
      </div>

      {/* Lista de Projetos (Nav) */}
      <div className="flex-1 overflow-y-auto p-3 p-b-20">
        <div className="flex items-center justify-between px-3 py-2 mb-2">
          <span className="text-xs font-medium text-slate-400 tracking-wider">
            {isArchiveMode ? "PROJETOS ARQUIVADOS" : "PROJETOS ATIVOS"}
          </span>
          {!isArchiveMode && (
            <div className="flex gap-2">
              <button 
                onClick={() => setModalOpen(true)}
                className="text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 active:scale-90 p-1 rounded transition-all" 
                title="Novo Projeto"
              >
                <Plus size={14} />
              </button>
              <button 
                onClick={() => loadProjetos(false)}
                className="text-slate-500 hover:text-slate-300 p-1 active:scale-90 transition-all" 
                title="Atualizar"
              >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21v-5h5"/></svg>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-slate-500 px-3 flex items-center gap-2">
             <div className="w-3 h-3 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
             Carregar...
          </div>
        ) : projetos.length === 0 ? (
          <div className="text-sm text-slate-500 px-3 text-center py-4 border border-dashed border-slate-800 rounded-lg">
            Nenhum projeto encontrado.
          </div>
        ) : (
          projetos.map(p => <ProjectItem key={p.id} projeto={p} />)
        )}
      </div>

      <div className="p-4 border-t border-slate-800 mt-auto bg-slate-900 z-10 flex flex-col gap-2">
        {/* Connectivity status indicator */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all",
          isSyncing
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
            : isOnline
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
        )}>
          {isSyncing ? (
            <RefreshCw size={12} className="animate-spin shrink-0" />
          ) : isOnline ? (
            <Wifi size={12} className="shrink-0" />
          ) : (
            <WifiOff size={12} className="shrink-0" />
          )}
          <span className="truncate">
            {isSyncing
              ? 'A sincronizar...'
              : isOnline
                ? lastSyncAt
                  ? `Sincronizado · ${new Date(lastSyncAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Online'
                : hasPendingMutations
                  ? 'Offline · Alterações pendentes'
                  : 'Offline · Cache local'
            }
          </span>
        </div>
        <button 
          onClick={() => setArchiveMode(!isArchiveMode)}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-3 rounded-lg active:scale-[0.98] transition-all duration-150 border text-sm font-medium",
            isArchiveMode 
              ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
              : "text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
          )}
        >
          <Archive size={16} />
          {isArchiveMode ? "Voltar ao Dashboard" : "Ver Arquivo"}
        </button>

        <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2.5 rounded-lg mt-1">
           <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded flex items-center justify-center shrink-0">
                 <User size={16} />
              </div>
              <div className="text-xs truncate text-slate-300">
                 <div className="truncate font-medium">{user?.user_metadata?.full_name || 'Utilizador'}</div>
                 <div className="truncate text-[10px] text-slate-500">{user?.email}</div>
              </div>
           </div>
           <button 
             onClick={() => supabase.auth.signOut()}
             className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 rounded transition-all"
             title="Terminar Sessão"
           >
             <LogOut size={16} />
           </button>
        </div>
      </div>

    </aside>
  );
}
