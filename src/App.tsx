
import { useEffect, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ProjectView } from "./components/ProjectView";
import { OfView } from "./components/OfView";
import { GlobalDashboard } from "./components/GlobalDashboard";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { UserManagement } from "./components/UserManagement";
import { useAppStore } from "./store/useAppStore";
import {
  runAutoArchive,
  getPendingCount,
  fetchUserRole,
  createProjetoRemote,
  createOFRemote,
  toggleTarefaConcluidaRemote,
  arquivarProjetoRemote,
  deleteProjetoRemote,
  deleteOrdemFabricoRemote,
  createTarefaRemote,
  updateProjectoUltimoMovimentoRemote,
} from "./services/api";
import { flushPendingMutations } from "./services/offlineCache";
import { Auth } from "./components/Auth";
import { PasswordReset } from "./components/PasswordReset";
import { supabase } from "./supabaseClient";

function App() {
  const {
    selectedProjectId,
    selectedOfId,
    setSearchOpen,
    session,
    setUser,
    setUserRole,
    setOnlineStatus,
    setSyncing,
    setLastSyncAt,
    setPendingMutations,
    isUserMgmtOpen,
    dataVersion,
    isPasswordRecovery,
    setPasswordRecovery,
  } = useAppStore();
  const [loading, setLoading] = useState(true);

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null, session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null, session);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  // ── Fetch role after login (e sempre que dataVersion mudar) ───
  useEffect(() => {
    if (session) {
      fetchUserRole().then((role) => setUserRole(role)).catch(() => setUserRole('user'));
    } else {
      setUserRole('user');
    }
  }, [session, setUserRole, dataVersion]);

  // ── CMD+K global search ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(!useAppStore.getState().isSearchOpen);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchOpen]);

  // ── Auto-archive (apenas online) ──────────────────────────────
  useEffect(() => {
    if (session) {
      runAutoArchive().catch(console.error);
    }
  }, [session]);

  // ── Online/Offline listeners ──────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setOnlineStatus(true);
      setSyncing(true);

      const remoteApi = {
        createProjetoRemote,
        createOFRemote,
        toggleTarefaConcluidaRemote,
        arquivarProjetoRemote,
        deleteProjetoRemote,
        deleteOrdemFabricoRemote,
        createTarefaRemote,
        updateProjectoUltimoMovimentoRemote,
      };

      try {
        const { flushed, errors } = await flushPendingMutations(remoteApi);
        if (errors.length > 0) {
          console.warn("[Nexar] Erros durante sync:", errors);
        }
        if (flushed > 0) {
          console.log(`[Nexar] ${flushed} mutação(ões) sincronizada(s) com sucesso.`);
        }
        setLastSyncAt(new Date().toISOString());
        setPendingMutations(false);
      } catch (e) {
        console.error("[Nexar] Erro ao fazer flush:", e);
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    // Verificar pendentes na inicialização
    const checkInitialPending = async () => {
      const count = await getPendingCount();
      setPendingMutations(count > 0);
      if (navigator.onLine) {
        setOnlineStatus(true);
        setLastSyncAt(new Date().toISOString());
        // Se há pendentes e estamos online, sincronizar automaticamente
        if (count > 0) {
          await handleOnline();
        }
        // Set initial sync time if online and no pending mutations
        if (navigator.onLine && count === 0) {
          setLastSyncAt(new Date().toISOString());
        }
      } else {
        setOnlineStatus(false);
      }
    };

    checkInitialPending();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setOnlineStatus, setSyncing, setLastSyncAt, setPendingMutations]);

  // ── Atualizar contagem de pendentes quando o store muda ───────
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!navigator.onLine) {
        const count = await getPendingCount();
        setPendingMutations(count > 0);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [setPendingMutations]);

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (isPasswordRecovery) {
    return <PasswordReset />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - FIXED 280px */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-900 border-l border-t border-slate-800 shadow-2xl overflow-hidden relative">
        <GlobalSearchModal />

        {/* Dynamic routing based on Zustand state */}
        {selectedOfId && <OfView ofId={selectedOfId} />}

        {!selectedOfId && selectedProjectId && (
          <ProjectView projetoId={selectedProjectId} />
        )}

        {!selectedOfId && !selectedProjectId && isUserMgmtOpen && <UserManagement />}

        {!selectedOfId && !selectedProjectId && !isUserMgmtOpen && <GlobalDashboard />}
      </main>
    </div>
  );
}

export default App;
