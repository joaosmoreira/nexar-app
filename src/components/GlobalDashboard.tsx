import { useEffect, useState } from 'react';
import { fetchDashboardMetrics, fetchAlertOFs } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { LayoutGrid, Layers, Archive, Factory, AlertTriangle, Clock, CalendarClock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAutoAnimate } from '@formkit/auto-animate/react';

// Helper para navegar directamente para uma OF (define projecto + OF)
function navigateToOf(projetoId: number, ofId: number) {
  useAppStore.setState({ selectedProjectId: projetoId, selectedOfId: ofId, isArchiveMode: false });
}

function AgeDot({ days }: { days: number }) {
  if (days > 21) return <span className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />;
  if (days > 14) return <span className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0" />;
  if (days > 7)  return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 shrink-0" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />;
}

export function GlobalDashboard() {
  const { isArchiveMode, setSelectedProject, dataVersion, user, userRole, isUserMgmtOpen, viewingUserId, viewingUserName, setViewingUser } = useAppStore();
  const [metrics, setMetrics] = useState<any[]>([]);
  const [oldestOfs, setOldestOfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [alertsParent] = useAutoAnimate();
  const [gridParent] = useAutoAnimate();

  const isAdmin = userRole === 'admin';

  const loadMetrics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [data, oldest] = await Promise.all([
        fetchDashboardMetrics(isArchiveMode),
        isArchiveMode ? Promise.resolve([]) : fetchAlertOFs(6),
      ]);

      let filteredMetrics = data;
      let filteredOldest = oldest;

      // Filtragem: se estiver a ver outro utilizador, ou se for Admin/User normal
      if (viewingUserId) {
        filteredMetrics = data.filter((p: any) => p.user_id === viewingUserId);
        filteredOldest = oldest.filter((o: any) => o.user_id === viewingUserId);
      } else if (isAdmin && !isUserMgmtOpen && user) {
        filteredMetrics = data.filter((p: any) => p.user_id === user.id);
        filteredOldest = oldest.filter((o: any) => o.user_id === user.id);
      } else if (!isAdmin && user) {
        filteredMetrics = data.filter((p: any) => p.user_id === user.id);
        filteredOldest = oldest.filter((o: any) => o.user_id === user.id);
      }

      setMetrics(filteredMetrics);
      setOldestOfs(filteredOldest);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Se já temos métricas e apenas o dataVersion mudou, fazemos refresh silencioso
    const isSilent = metrics.length > 0;
    loadMetrics(isSilent);
  }, [isArchiveMode, dataVersion, isUserMgmtOpen, userRole, viewingUserId]);

  if (loading && metrics.length === 0) {
     return <div className="p-8 text-slate-400 font-medium animate-pulse">A carregar métricas globais...</div>;
  }

  return (
    <div className="p-8 pb-32 h-full overflow-y-auto">
      {viewingUserId && (
        <div className="bg-sky-500/10 border border-sky-500/20 text-sky-400 p-4 rounded-xl mb-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Layers size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">A visualizar o Dashboard de {viewingUserName}</h3>
              <p className="text-xs text-sky-500/70">Estás a ver as obras e estatísticas associadas a este utilizador.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setViewingUser(null, null);
              useAppStore.getState().setUserMgmtOpen(true);
            }} 
            className="text-xs font-medium px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 active:scale-95 transition-all rounded-lg"
          >
            Sair desta vista
          </button>
        </div>
      )}

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

      {/* ── ALERTAS: OFs abertas há mais tempo ─────────────────────── */}
      {!isArchiveMode && oldestOfs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
              Ordens em Aberto — Aguardam Despacho
            </h2>
          </div>
          <div ref={alertsParent as any} className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {oldestOfs.map((of: any) => {
              const ageDays = Math.floor((Date.now() - new Date(of.criado_em).getTime()) / (1000 * 60 * 60 * 24));
              const projNome = of.projectos?.nome || '';
              const [projRef] = projNome.split(' - ');

              // prazo_limite badge
              const prazoMs = of.prazo_limite ? new Date(of.prazo_limite).getTime() - Date.now() : null;
              const prazoDias = prazoMs !== null ? Math.ceil(prazoMs / (1000 * 60 * 60 * 24)) : null;
              const prazoExp = prazoDias !== null && prazoDias < 0;
              const prazoUrg = prazoDias !== null && prazoDias >= 0 && prazoDias <= 7;

              return (
                <button
                  key={of.id}
                  onClick={() => navigateToOf(of.projeto_id, of.id)}
                  className="text-left bg-slate-800/50 border border-amber-500/20 hover:border-amber-400/40 hover:bg-slate-800 rounded-xl p-4 transition-all group active:scale-95"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AgeDot days={ageDays} />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">{projRef}</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-sky-400 group-hover:text-sky-300 transition-colors mb-1 truncate">
                    {of.numero_of}
                  </div>
                  <div className="text-xs text-slate-400 truncate mb-3">{of.nome_of}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={10} />
                      <span className={cn(
                        ageDays > 21 ? 'text-red-400 font-bold' :
                        ageDays > 14 ? 'text-amber-400 font-semibold' :
                        'text-slate-400'
                      )}>
                        {ageDays}d em aberto
                      </span>
                    </div>
                    {(prazoExp || prazoUrg) && (
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded",
                        prazoExp ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                      )}>
                        <CalendarClock size={9} />
                        {prazoExp ? 'Expirado' : `${prazoDias}d`}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARDS DE PROJETOS ──────────────────────────────────────── */}
      {metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-slate-500 border border-slate-800 rounded-2xl bg-slate-800/20 border-dashed">
           <Factory size={48} className="mb-4 opacity-50" />
           <span className="text-lg font-medium">Nenhum projeto encontrado.</span>
        </div>
      ) : (
        <div ref={gridParent as any} className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(max(280px, calc(33.333% - 16px)), 1fr))' }}>
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
                       <h2 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors line-clamp-2 leading-snug min-h-[3.5rem]" title={projNameOnly}>
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
