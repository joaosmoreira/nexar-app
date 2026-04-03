import { useEffect, useState } from 'react';
import { fetchDashboardMetrics } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { LayoutGrid, Layers, Archive, Factory } from 'lucide-react';
import { cn } from '../lib/utils';

export function GlobalDashboard() {
  const { isArchiveMode, setSelectedProject } = useAppStore();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardMetrics(isArchiveMode);
      setMetrics(data);
    } catch (e: any) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, [isArchiveMode]);

  if (loading) {
     return <div className="p-8 text-slate-400 font-medium animate-pulse">A carregar métricas globais...</div>;
  }

  return (
    <div className="p-8 pb-32 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className={cn("p-3 rounded-xl shadow-lg border", isArchiveMode ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-sky-500/20 text-sky-400 border-sky-500/30")}>
           {isArchiveMode ? <Archive size={24} /> : <LayoutGrid size={24} />}
        </div>
        <div>
           <h1 className="text-3xl font-bold text-slate-100">
             {isArchiveMode ? "Arquivo de Obras" : "Dashboard de Obras"}
           </h1>
           <p className="text-slate-400 mt-1">
             {isArchiveMode ? "Consulta do histórico de portfólio" : "Ponto de situação global e ativo da fábrica"}
           </p>
        </div>
      </div>

      {metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 border border-slate-800 rounded-2xl bg-slate-800/20 border-dashed">
           <Factory size={48} className="mb-4 opacity-50" />
           <span className="text-lg font-medium">Nenhum projeto encontrado.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {metrics.map(projeto => {
             let abertas = 0;
             let concluido = 0;
             const totalOfs = projeto.ordens_fabrico ? projeto.ordens_fabrico.length : 0;

             if (projeto.ordens_fabrico) {
               projeto.ordens_fabrico.forEach((of: any) => {
                 const tTotal = of.tarefas ? of.tarefas.length : 0;
                 if (tTotal === 0) {
                    abertas++; // Se não tem tarefas criadas ainda, consideramos a OF aberta por iniciar
                 } else {
                    const picadas = of.tarefas.filter((t: any) => t.concluido).length;
                    if (picadas === tTotal) concluido++;
                    else abertas++;
                 }
               });
             }

             const [ref, ...rest] = projeto.nome.split(" - ");
             const projNameOnly = rest.length > 0 ? rest.join(" - ") : (projeto.cliente || projeto.nome);

             return (
               <div 
                 key={projeto.id} 
                 onClick={() => setSelectedProject(projeto.id)}
                 className="relative bg-slate-800/40 border border-slate-700/80 hover:border-sky-500/50 hover:bg-slate-800 rounded-2xl p-6 transition-all duration-300 cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-900/20 active:scale-95"
               >
                 <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                       <div className="text-xs font-bold tracking-widest uppercase text-sky-500/70 mb-1" title={ref}>
                          {ref}
                       </div>
                       <h2 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors truncate" title={projNameOnly}>
                          {projNameOnly}
                       </h2>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-sky-400 transition-colors shrink-0 ml-2">
                       <Layers size={14} className="shrink-0" />
                    </div>
                 </div>

                 <div className="mt-8 space-y-3">
                    <div className="text-xs text-slate-500 flex justify-between">
                       <span>Desempenho da Obra ({totalOfs} OFs)</span>
                    </div>

                    <div className="flex gap-4">
                       <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                         <div className="text-xs text-amber-500/80 mb-1 font-medium">Abertas</div>
                         <div className="text-2xl font-light text-amber-400">{abertas}</div>
                       </div>
                       <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                         <div className="text-xs text-emerald-500/80 mb-1 font-medium">Terminadas</div>
                         <div className="text-2xl font-light text-emerald-400">{concluido}</div>
                       </div>
                    </div>
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
