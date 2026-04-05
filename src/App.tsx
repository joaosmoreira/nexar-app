
import { useEffect, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ProjectView } from "./components/ProjectView";
import { OfView } from "./components/OfView";
import { GlobalDashboard } from "./components/GlobalDashboard";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { useAppStore } from "./store/useAppStore";
import { runAutoArchive } from "./services/api";
import { Auth } from "./components/Auth";
import { supabase } from "./supabaseClient";

function App() {
  const { selectedProjectId, selectedOfId, setSearchOpen, session, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    // CMD/CTRL+K Listener for global search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(!useAppStore.getState().isSearchOpen);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    if (session) {
      runAutoArchive().catch(console.error);
    }
  }, [session]);

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
        {!selectedProjectId && !selectedOfId && (
          <GlobalDashboard />
        )}

        {selectedProjectId && !selectedOfId && (
          <ProjectView projetoId={selectedProjectId} />
        )}

        {selectedOfId && (
          <OfView ofId={selectedOfId} />
        )}
      </main>
    </div>
  );
}

export default App;
