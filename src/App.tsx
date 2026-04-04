
import { useEffect } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ProjectView } from "./components/ProjectView";
import { OfView } from "./components/OfView";
import { GlobalDashboard } from "./components/GlobalDashboard";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { useAppStore } from "./store/useAppStore";
import { runAutoArchive } from "./services/api";

function App() {
  const { selectedProjectId, selectedOfId, setSearchOpen } = useAppStore();

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
  }, []);

  useEffect(() => {
    runAutoArchive().catch(console.error);
  }, []);

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
