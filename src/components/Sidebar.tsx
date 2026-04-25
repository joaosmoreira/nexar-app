import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  createProjeto, reorderProjetos,
  Projeto, UserWithRole 
} from '../services/api';
import { Layers, Plus, Archive, Search, LogOut, User, Users, Wifi, WifiOff, RefreshCw, KeyRound, Folder, ChevronDown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useSidebarData } from '../hooks/useSidebarData';
import { ProjectItem } from './Sidebar/ProjectItem';
import { AdminUserGroup } from './Sidebar/AdminUserGroup';

export function Sidebar() {
  // Seletores granulares para evitar re-renders globais desnecessários
  const isArchiveMode = useAppStore(s => s.isArchiveMode);
  const setArchiveMode = useAppStore(s => s.setArchiveMode);
  const user = useAppStore(s => s.user);
  const userRole = useAppStore(s => s.userRole);
  const isOnline = useAppStore(s => s.isOnline);
  const isSyncing = useAppStore(s => s.isSyncing);
  const lastSyncAt = useAppStore(s => s.lastSyncAt);
  const hasPendingMutations = useAppStore(s => s.hasPendingMutations);
  const isUserMgmtOpen = useAppStore(s => s.isUserMgmtOpen);
  const setUserMgmtOpen = useAppStore(s => s.setUserMgmtOpen);
  const viewingUserId = useAppStore(s => s.viewingUserId);

  const {
    projetos, setProjetos, loading, deadlineProjectIds, 
    completedProjectIds, allUsers, loadProjetos, isAdmin
  } = useSidebarData();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<number | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    if (isArchiveMode) return;

    const oldIndex = projetos.findIndex(p => p.id === active.id);
    const newIndex = projetos.findIndex(p => p.id === over.id);

    const reordered = arrayMove(projetos, oldIndex, newIndex).map((p, i) => ({ ...p, ordem_index: i }));
    setProjetos(reordered);

    try {
      await reorderProjetos(reordered.map(p => ({ id: p.id, ordem_index: p.ordem_index || 0 })));
    } catch (e: any) {
      toast.error('Erro ao reordenar projetos: ' + e.message);
      loadProjetos();
    }
  };

  // Password change state
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(''); setPwSuccess('');

    if (newPw !== confirmPw) {
      setPwError('As palavras-passe não coincidem.');
      return;
    }

    setPwLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPw,
      });

      if (authError) throw new Error('A palavra-passe atual está incorreta.');

      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;

      setPwSuccess('Palavra-passe alterada com sucesso!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setPwModalOpen(false); setPwSuccess(''); }, 1500);
    } catch (err: any) {
      setPwError(err.message || 'Erro ao alterar palavra-passe.');
    } finally {
      setPwLoading(false);
    }
  };

  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('nexar-sidebar-width');
    return saved ? Math.max(288, Math.min(400, parseInt(saved, 10))) : 288;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 288) newWidth = 288;
      if (newWidth > 400) newWidth = 400;
      setWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);

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
    };
  }, [isResizing, width]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newProjRef, setNewProjRef] = useState("");
  const [newProjCli, setNewProjCli] = useState("");
  const [targetUserId, setTargetUserId] = useState<string>("");

  useEffect(() => {
    if (modalOpen) {
      setTargetUserId(viewingUserId || user?.id || "");
    }
  }, [modalOpen, viewingUserId, user?.id]);

  const handleCreateProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjRef) return;
    try {
      const formattedRef = `GS${newProjRef}`;
      const finalUserId = (isAdmin && (isUserMgmtOpen || viewingUserId)) ? targetUserId : undefined;
      
      await createProjeto(
        formattedRef, 
        newProjCli.trim() === "" ? "Desconhecido" : newProjCli,
        finalUserId
      );
      
      await loadProjetos();
      setModalOpen(false);
      setNewProjRef(""); setNewProjCli("");
      useAppStore.getState().incrementDataVersion();
      toast.success("Projeto criado com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao criar projeto: " + e.message);
    }
  };

  // Memorizar as listas para evitar recálculo ao apenas selecionar uma obra
  const { gs0000, outrosProjetos } = useMemo(() => {
    const myProjetos = isAdmin && !(isUserMgmtOpen || viewingUserId)
      ? projetos.filter(p => p.user_id === user?.id)
      : projetos;

    const gs = myProjetos.find(p => p.nome.startsWith('GS0000'));
    const others = myProjetos
      .filter(p => !p.nome.startsWith('GS0000'))
      .sort((a, b) => {
        const aDone = completedProjectIds.includes(a.id);
        const bDone = completedProjectIds.includes(b.id);
        if (aDone !== bDone) return aDone ? 1 : -1;
        return (a.ordem_index ?? 0) - (b.ordem_index ?? 0);
      });

    return { gs0000: gs, outrosProjetos: others };
  }, [projetos, isAdmin, isUserMgmtOpen, viewingUserId, user?.id, completedProjectIds]);

  const userGroups = useMemo(() => {
    if (!isAdmin || allUsers.length === 0) return [];
    
    const map = new Map<string, { userInfo: UserWithRole; projetos: Projeto[] }>();
    for (const u of allUsers) {
      map.set(u.user_id, { userInfo: u, projetos: [] });
    }
    for (const p of projetos) {
      const group = map.get(p.user_id);
      if (group) group.projetos.push(p);
    }

    return [...map.values()].sort((a, b) => {
      if (a.userInfo.user_id === user?.id) return -1;
      if (b.userInfo.user_id === user?.id) return 1;
      return a.userInfo.email.localeCompare(b.userInfo.email);
    });
  }, [isAdmin, allUsers, projetos, user?.id]);

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

          {isAdmin && (isUserMgmtOpen || viewingUserId) && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Atribuir a Utilizador</label>
              <div className="relative">
                <select
                  value={targetUserId}
                  onChange={e => setTargetUserId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all appearance-none pr-10 cursor-pointer"
                >
                  {allUsers.map(u => (
                    <option key={u.user_id} value={u.user_id} className="bg-slate-900">
                      {u.nome || u.email.split('@')[0]} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>
          )}
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
          useAppStore.getState().setViewingUser(null, null); // Limpar impersonation ao voltar ao HUB
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
      <div className="flex-1 overflow-y-auto p-3 pb-20">
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
                 <RefreshCw size={14} />
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
        ) : isAdmin && (isUserMgmtOpen || viewingUserId) && userGroups.length > 0 ? (
          /* ── Vista Admin: agrupada por utilizador ──────────── */
          <div className="space-y-1">
            <button 
              onClick={() => {
                useAppStore.getState().setViewingUser(null, null);
                setUserMgmtOpen(true);
                useAppStore.getState().setSelectedProject(null);
                useAppStore.getState().setSelectedOf(null);
              }}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all mb-2 border",
                (isUserMgmtOpen && !viewingUserId)
                  ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                  : "hover:bg-slate-800/50 text-slate-400 border-transparent"
              )}
            >
              <Users size={14} className="shrink-0 text-violet-400" />
              <span className="text-[12px] font-semibold">Painel Geral de Equipa</span>
            </button>

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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as number)} onDragEnd={handleDragEnd}>
            <SortableContext items={outrosProjetos.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {/* GS0000 — sempre fixo no topo */}
              {gs0000 && (
                <div className="mb-1">
                  <div className="px-3 py-1 mb-1">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-slate-600">Trabalhos Gerais</span>
                  </div>
                  <ProjectItem key={gs0000.id} projeto={gs0000} deadlineProjectIds={deadlineProjectIds} completedProjectIds={completedProjectIds} isSortable={false} />
                  {outrosProjetos.length > 0 && <div className="my-2 border-t border-slate-800/60" />}
                </div>
              )}
              {/* Restantes projetos */}
              {outrosProjetos.map(p => (
                <ProjectItem key={p.id} projeto={p} deadlineProjectIds={deadlineProjectIds} completedProjectIds={completedProjectIds} isSortable={!isArchiveMode} />
              ))}
            </SortableContext>
            
            <DragOverlay>
              {activeId ? (
                <div className="bg-slate-800 border border-sky-500/50 rounded-lg p-2 opacity-90 shadow-2xl flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-sky-500/20 flex items-center justify-center">
                    <Folder size={14} className="text-sky-400" />
                  </div>
                  <span className="text-sm text-slate-200 truncate">
                    {projetos.find(p => p.id === activeId)?.nome}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
              if (viewingUserId) {
                useAppStore.getState().setViewingUser(null, null);
                setUserMgmtOpen(true);
              } else {
                setUserMgmtOpen(!isUserMgmtOpen);
              }
              useAppStore.getState().setSelectedProject(null);
              useAppStore.getState().setSelectedOf(null);
              useAppStore.getState().setArchiveMode(false);
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 p-3 rounded-lg active:scale-[0.98] transition-all duration-150 border text-sm font-medium",
              (isUserMgmtOpen || viewingUserId)
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
            <label className="block text-sm font-medium text-slate-400 mb-1">Palavra-passe Atual</label>
            <input
              autoFocus
              type="password"
              required
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Digite a sua password atual"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nova palavra-passe</label>
            <input
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
