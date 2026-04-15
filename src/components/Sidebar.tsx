import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { fetchProjetos, fetchOfsByProjeto, createProjeto, fetchProjetosArquivados, fetchOfsWithDeadlineSoon, fetchProjectsCompletionStatus, fetchAllUsers, Projeto, OrdemFabrico, UserWithRole } from '../services/api';
import { Folder, FileCog, Layers, Plus, Archive, AlertTriangle, CheckCircle2, Search, LogOut, User, Users, Wifi, WifiOff, RefreshCw, ChevronRight, KeyRound } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { toast } from 'sonner';

// ─── Cache de prazos próximos (atualizado 1x/dia ou no arranque) ────────────
const DEADLINE_CACHE_KEY = 'nexar-deadline-cache';
const DEADLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface DeadlineCache {
  fetchedAt: number;
  projectIds: number[];          // OFs com prazo < 7 dias
  completedProjectIds: number[]; // Projetos com todas as OFs concluídas
}

function readDeadlineCache(): DeadlineCache | null {
  try {
    const raw = localStorage.getItem(DEADLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeadlineCache;
    // Invalida o cache se o campo completedProjectIds estiver em falta (formato antigo)
    if (!Array.isArray(parsed.completedProjectIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDeadlineCache(projectIds: number[], completedProjectIds: number[]) {
  const entry: DeadlineCache = { fetchedAt: Date.now(), projectIds, completedProjectIds };
  localStorage.setItem(DEADLINE_CACHE_KEY, JSON.stringify(entry));
}

async function getProjectsStatusCache(): Promise<{ deadlineIds: number[]; completedIds: number[] }> {
  const cached = readDeadlineCache();
  if (cached && Date.now() - cached.fetchedAt < DEADLINE_CACHE_TTL_MS) {
    return { deadlineIds: cached.projectIds, completedIds: cached.completedProjectIds || [] };
  }
  // Cache expirada ou inexistente — vai buscar ambos em paralelo
  const [ofs, completedIds] = await Promise.all([
    fetchOfsWithDeadlineSoon(),
    fetchProjectsCompletionStatus(),
  ]);
  const deadlineIds = [...new Set(ofs.map(o => o.projeto_id))];
  writeDeadlineCache(deadlineIds, completedIds);
  return { deadlineIds, completedIds };
}

// ─── ProjectItem ──────────────────────────────────────────────────────────────

function ProjectItem({ projeto, deadlineProjectIds, completedProjectIds }: { projeto: Projeto; deadlineProjectIds: number[]; completedProjectIds: number[] }) {
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

  // Determinar ícone da pasta — completedProjectIds já vem do cache (sem depender do isExpanded)
  const allDone = completedProjectIds.includes(projeto.id);
  // Atualiza também quando o projeto está expandido e as OFs foram carregadas localmente
  const allDoneLocal = ofs.length > 0 && ofs.every((o: any) => o.progress === 100);
  const isCompleted = allDone || (isExpanded && allDoneLocal);
  const hasDeadlineSoon = deadlineProjectIds.includes(projeto.id);

  let folderIcon;
  if (isCompleted) {
    folderIcon = <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />;
  } else if (hasDeadlineSoon) {
    folderIcon = <AlertTriangle size={18} className={cn("shrink-0 transition-colors", isSelected ? "text-amber-400" : "text-amber-500")} />;
  } else {
    folderIcon = <Folder size={18} className={cn("shrink-0 transition-colors", isSelected ? "text-sky-400" : "text-sky-500/50")} />;
  }

  return (
    <div className="mb-2">
      <button
        onClick={() => setSelectedProject(projeto.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
          isSelected ? "bg-slate-800 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
        )}
      >
        {folderIcon}
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

  // Verificar prazo limite
  const now = Date.now();
  const prazoMs = ofData.prazo_limite ? new Date(ofData.prazo_limite).getTime() - now : null;
  const prazoEmDias = prazoMs !== null ? prazoMs / (1000 * 60 * 60 * 24) : null;
  const prazoUrgente = prazoEmDias !== null && prazoEmDias <= 7 && prazoEmDias >= 0 && progresso < 100;
  const prazoExpirado = prazoEmDias !== null && prazoEmDias < 0 && progresso < 100;

  let iconToRender;
  if (progresso >= 100) {
     iconToRender = <CheckCircle2 size={16} className="text-emerald-500" />;
  } else if (prazoExpirado) {
     iconToRender = <AlertTriangle size={16} className="text-red-500" />;
  } else if (prazoUrgente) {
     iconToRender = <AlertTriangle size={16} className="text-amber-400" />;
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

// ─── AdminUserGroup — Nível de utilizador na vista admin ──────────────────────

function AdminUserGroup({ userInfo, projetos, deadlineProjectIds, completedProjectIds }: {
  userInfo: UserWithRole;
  projetos: Projeto[];
  deadlineProjectIds: number[];
  completedProjectIds: number[];
}) {
  const [expanded, setExpanded] = useState(false);
  const currentUserId = useAppStore.getState().user?.id;
  const isCurrentUser = userInfo.user_id === currentUserId;
  const emailLabel = userInfo.email.split('@')[0];

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group",
          expanded ? "bg-violet-500/10 text-violet-300" : "hover:bg-slate-800/50 text-slate-400"
        )}
      >
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded && "rotate-90"
          )}
        />
        <div className={cn(
          "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
          isCurrentUser
            ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
        )}>
          {emailLabel[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left truncate">
          <div className="text-[12px] font-medium truncate">{emailLabel}</div>
          <div className="text-[10px] opacity-50 truncate">{projetos.length} obra{projetos.length !== 1 ? 's' : ''}</div>
        </div>
        {isCurrentUser && (
          <span className="text-[9px] text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded font-medium shrink-0">Tu</span>
        )}
      </button>

      {expanded && (
        <div className="ml-3 mt-1 pl-3 border-l border-slate-800 space-y-0.5">
          {projetos.length === 0 ? (
            <div className="text-[11px] text-slate-600 px-3 py-2">Sem obras</div>
          ) : (
            projetos.map(p => (
              <ProjectItem key={p.id} projeto={p} deadlineProjectIds={deadlineProjectIds} completedProjectIds={completedProjectIds} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const { isArchiveMode, setArchiveMode, user, userRole, isOnline, isSyncing, lastSyncAt, hasPendingMutations, dataVersion, setUserMgmtOpen, isUserMgmtOpen } = useAppStore();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineProjectIds, setDeadlineProjectIds] = useState<number[]>([]);
  const [completedProjectIds, setCompletedProjectIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const isAdmin = userRole === 'admin';

  // Password change state
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPw !== confirmPw) {
      setPwError('As palavras-passe não coincidem.');
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      setPwSuccess('Palavra-passe alterada com sucesso!');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => { setPwModalOpen(false); setPwSuccess(''); }, 1500);
    } catch (err: any) {
      setPwError(err.message || 'Erro ao alterar palavra-passe.');
    } finally {
      setPwLoading(false);
    }
  };

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

  // Carregar cache de prazos e projetos concluídos — apenas no arranque e depois 1x/dia
  useEffect(() => {
    getProjectsStatusCache()
      .then(({ deadlineIds, completedIds }) => {
        setDeadlineProjectIds(deadlineIds);
        setCompletedProjectIds(completedIds);
      })
      .catch(() => {}); // silencioso — não é crítico
  }, []);

  // Carregar lista de utilizadores para vista de admin
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
    }
  }, [isAdmin]);

  const firstLoad = useRef(true);
  const previousArchiveMode = useRef(isArchiveMode);

  useEffect(() => {
    // Apenas mostramos o loader se houver mudança de view (ex: Archive Mode) ou no 1º load
    const isSilent = previousArchiveMode.current === isArchiveMode && !firstLoad.current;
    
    loadProjetos(isSilent);
    
    firstLoad.current = false;
    previousArchiveMode.current = isArchiveMode;

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
    return saved ? Math.max(288, Math.min(400, parseInt(saved, 10))) : 288;
  });
  const [isResizing, setIsResizing] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 288) newWidth = 288;
      if (newWidth > 400) newWidth = 400;
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

  // Admin em modo normal: mostrar apenas os seus projetos (como um user normal)
  const myProjetos = isAdmin && !isUserMgmtOpen
    ? projetos.filter(p => p.user_id === user?.id)
    : projetos;

  // Separar GS0000 dos restantes projetos
  const gs0000 = myProjetos.find(p => p.nome.startsWith('GS0000'));
  const outrosProjetos = myProjetos.filter(p => !p.nome.startsWith('GS0000'));

  // Agrupamento por utilizador (vista admin)
  const userGroupMap = new Map<string, { userInfo: UserWithRole; projetos: Projeto[] }>();
  if (isAdmin && allUsers.length > 0) {
    // Inicializar mapa com todos os utilizadores
    for (const u of allUsers) {
      userGroupMap.set(u.user_id, { userInfo: u, projetos: [] });
    }
    // Distribuir projetos pelos utilizadores
    for (const p of projetos) {
      const group = userGroupMap.get(p.user_id);
      if (group) {
        group.projetos.push(p);
      }
    }
  }
  // Ordenar: utilizador atual primeiro, depois por email
  const userGroups = [...userGroupMap.values()].sort((a, b) => {
    if (a.userInfo.user_id === user?.id) return -1;
    if (b.userInfo.user_id === user?.id) return 1;
    return a.userInfo.email.localeCompare(b.userInfo.email);
  });

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
        onClick={() => { 
          setArchiveMode(false); 
          useAppStore.getState().setSelectedProject(null); 
          useAppStore.getState().setSelectedOf(null);
          useAppStore.getState().setUserMgmtOpen(false);
          useAppStore.getState().incrementDataVersion(); 
        }}
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
          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-medium tracking-widest shrink-0 hidden lg:block">
            {navigator.userAgent.toLowerCase().includes('mac') ? 'CMD+K' : 'CTRL+K'}
          </span>
        </button>
      </div>

      {/* Lista de Projetos (Nav) */}
      <div ref={navRef} className="flex-1 overflow-y-auto p-3 pb-20">
        <div className="flex items-center justify-between px-3 py-2 mb-2 gap-2">
          <span className="text-xs font-medium text-slate-400 tracking-wider shrink-0 whitespace-nowrap">
            {isArchiveMode ? "PROJETOS ARQUIVADOS" : "PROJETOS ATIVOS"}
          </span>
          {!isArchiveMode && (
            <div className="flex gap-1.5 shrink-0">
              <button 
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 px-2 py-1 rounded-lg transition-all border border-emerald-500/20 whitespace-nowrap" 
                title="Nova Obra"
              >
                <Plus size={12} /> Nova Obra
              </button>
              <button 
                onClick={() => loadProjetos(false)}
                className="text-slate-500 hover:text-slate-300 p-1 active:scale-90 transition-all shrink-0" 
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
        ) : isAdmin && isUserMgmtOpen && userGroups.length > 0 ? (
          /* ── Vista Admin: agrupada por utilizador ──────────── */
          <div className="space-y-1">
            {userGroups.map(({ userInfo, projetos: userProjetos }) => (
              <AdminUserGroup
                key={userInfo.user_id}
                userInfo={userInfo}
                projetos={userProjetos}
                deadlineProjectIds={deadlineProjectIds}
                completedProjectIds={completedProjectIds}
              />
            ))}
          </div>
        ) : (
          /* ── Vista Normal: flat ───────────────────────────── */
          <>
            {/* GS0000 — sempre fixo no topo */}
            {gs0000 && (
              <div className="mb-1">
                <div className="px-3 py-1 mb-1">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600">Trabalhos Gerais</span>
                </div>
                <ProjectItem key={gs0000.id} projeto={gs0000} deadlineProjectIds={deadlineProjectIds} completedProjectIds={completedProjectIds} />
                {outrosProjetos.length > 0 && <div className="my-2 border-t border-slate-800/60" />}
              </div>
            )}
            {/* Restantes projetos */}
            {outrosProjetos.map(p => (
              <ProjectItem key={p.id} projeto={p} deadlineProjectIds={deadlineProjectIds} completedProjectIds={completedProjectIds} />
            ))}
          </>
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

        {/* Botão Gestão de Equipa — apenas Admins */}
        {userRole === 'admin' && (
          <button
            onClick={() => {
              setUserMgmtOpen(!isUserMgmtOpen);
              useAppStore.getState().setSelectedProject(null);
              useAppStore.getState().setSelectedOf(null);
              useAppStore.getState().setArchiveMode(false);
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-3 rounded-lg active:scale-[0.98] transition-all duration-150 border text-sm font-medium",
              isUserMgmtOpen
                ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                : "text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-slate-200"
            )}
          >
            <Users size={16} />
            Gestão de Equipa
          </button>
        )}
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
           <div className="flex items-center gap-0.5 shrink-0">
              <button 
                onClick={() => setPwModalOpen(true)}
                className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 active:scale-90 rounded transition-all"
                title="Alterar Palavra-passe"
              >
                <KeyRound size={16} />
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 rounded transition-all"
                title="Terminar Sessão"
              >
                <LogOut size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Modal Alterar Password */}
      <Modal isOpen={pwModalOpen} title="Alterar Palavra-passe" onClose={() => { setPwModalOpen(false); setPwError(''); setPwSuccess(''); }}>
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          {pwError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg p-3">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg p-3">
              {pwSuccess}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nova palavra-passe</label>
            <input
              autoFocus
              type="password"
              required
              minLength={6}
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Confirmar nova palavra-passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Repete a palavra-passe"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="mt-2 w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-medium rounded-lg p-3 transition-all disabled:opacity-50"
          >
            {pwLoading ? 'A alterar...' : 'Alterar Palavra-passe'}
          </button>
        </form>
      </Modal>

    </aside>
  );
}
