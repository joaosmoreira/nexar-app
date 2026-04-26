
import { useEffect, useState, lazy, Suspense } from "react";
import "./App.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { useAppStore } from "@/store/useAppStore";
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
  reorderProjetosRemote,
} from "@/services/api";
import { flushPendingMutations } from "@/services/offlineCache";
import { Auth } from "@/features/auth/components/Auth";
import { PasswordReset } from "@/features/admin/components/PasswordReset";
import { supabase } from "@/supabaseClient";
import { ErrorBoundary } from "react-error-boundary";
// Carregamento Preguiçoso (Code-Splitting)
const GlobalDashboard = lazy(() => import("@/features/projects/components/GlobalDashboard").then(m => ({ default: m.GlobalDashboard })));
const ProjectView = lazy(() => import("@/features/projects/components/ProjectView").then(m => ({ default: m.ProjectView })));
const OfView = lazy(() => import("@/features/projects/components/OfView").then(m => ({ default: m.OfView })));
const UserManagement = lazy(() => import("@/features/admin/components/UserManagement").then(m => ({ default: m.UserManagement })));

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin"></div>
        <span className="text-xs text-slate-500 font-medium tracking-widest uppercase">A carregar vista...</span>
      </div>
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900 p-8 text-center h-full z-50">
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-500 text-2xl">⚠️</span>
      </div>
      <h2 className="text-lg font-semibold text-slate-100 mb-2">Ups, algo correu mal a carregar a página!</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">{error?.message || "Ocorreu um erro inesperado."}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}

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
        reorderProjetosRemote,
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

    // Keep-alive: renovar sessão se a app voltar a ter foco (ex: acordar do minimizado)
    const handleFocus = () => {
      if (navigator.onLine) {
        supabase.auth.refreshSession().catch(e => console.warn("[Nexar] Erro no refresh de sessão on-focus:", e));
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
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

        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
          <Suspense fallback={<LoadingScreen />}>
            {/* Dynamic routing based on Zustand state */}
            {selectedOfId && <OfView ofId={selectedOfId} />}

            {!selectedOfId && selectedProjectId && (
              <ProjectView projetoId={selectedProjectId} />
            )}

            {!selectedOfId && !selectedProjectId && isUserMgmtOpen && <UserManagement />}

            {!selectedOfId && !selectedProjectId && !isUserMgmtOpen && <GlobalDashboard />}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;
