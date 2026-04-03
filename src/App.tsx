
import { useEffect } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { ProjectView } from "./components/ProjectView";
import { OfView } from "./components/OfView";
import { GlobalDashboard } from "./components/GlobalDashboard";
import { useAppStore } from "./store/useAppStore";
import { runAutoArchive } from "./services/api";

function App() {
  const { selectedProjectId, selectedOfId } = useAppStore();

  useEffect(() => {
    runAutoArchive().catch(console.error);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar - FIXED 280px */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-900 border-l border-t border-slate-800 shadow-2xl overflow-hidden relative">
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
