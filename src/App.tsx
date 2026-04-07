
import { useEffect, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ProjectView } from "./components/ProjectView";
import { OfView } from "./components/OfView";
import { GlobalDashboard } from "./components/GlobalDashboard";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { useAppStore } from "./store/useAppStore";
import {
  runAutoArchive,
  getPendingCount,
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
import { supabase } from "./supabaseClient";

function App() {
  const {
    selectedProjectId,
    selectedOfId,
    setSearchOpen,
    session,
    setUser,
    setOnlineStatus,
    setSyncing,
    setLastSyncAt,
    setPendingMutations,
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null, session);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

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

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - FIXED 280px */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-900 border-l border-t border-slate-800 shadow-2xl overflow-hidden relative">
        <GlobalSearchModal />

        {/* Dynamic routing based on Zustand state */}
        {!selectedProjectId && !selectedOfId && <GlobalDashboard />}

        {selectedProjectId && !selectedOfId && (
          <ProjectView projetoId={selectedProjectId} />
        )}

        {selectedOfId && <OfView ofId={selectedOfId} />}
      </main>
    </div>
  );
}

export default App;
