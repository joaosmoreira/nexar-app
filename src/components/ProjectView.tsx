import React, { useState, useEffect } from 'react';
import { 
  createOF, deleteProjeto, arquivarProjeto, 
  fetchNextGs0000OfNumber
} from '../services/api';
import { exportToJson, exportProjectExcelWithTasks } from '../lib/exportUtils';
import { FileDown, PlusCircle, Archive, Trash2, CalendarClock, StickyNote } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { toast } from 'sonner';
import { useProjectData } from '../hooks/useProjectData';

export function ProjectView({ projetoId }: { projetoId: number }) {
  const { 
    projeto, ofs, loading, loadData 
  } = useProjectData(projetoId);

  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [newOfName, setNewOfName] = useState("");
  const [newOfNumber, setNewOfNumber] = useState("");
  const [newOfPrazo, setNewOfPrazo] = useState("");
  const [isGs0000, setIsGs0000] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInputName, setDeleteInputName] = useState("");

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (archiveModalOpen) {
      setArchiveProgress(0);
      interval = setInterval(() => {
        setArchiveProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            return 100;
          }
          return p + 1;
        });
      }, 20);
    }
    return () => clearInterval(interval);
  }, [archiveModalOpen]);

  const openNewOfModal = async () => {
    const gs = projeto?.nome.startsWith('GS0000') || false;
    setIsGs0000(gs);
    setNewOfName("");
    setNewOfPrazo("");
    if (gs) {
      const next = await fetchNextGs0000OfNumber(projetoId);
      setNewOfNumber(next);
    } else {
      setNewOfNumber("");
    }
    setModalOpen(true);
  };

  const submitOf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfName || !newOfNumber) return;
    try {
      setCreating(true);
      const prazoIso = newOfPrazo ? new Date(newOfPrazo).toISOString() : null;
      await createOF(projetoId, newOfName, newOfNumber, prazoIso);
      await loadData();
      setModalOpen(false);
      setNewOfName(""); setNewOfNumber(""); setNewOfPrazo("");
      useAppStore.getState().incrementDataVersion();
      toast.success("Ordem de fabrico criada com sucesso!");
    } catch (e: any) {
      toast.error("Erro ao criar: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  const onExportJson = () => {
    const exportData = ofs.map(of => ({ ID: of.numero_of, Nome: of.nome_of, Progresso: `${of.progress}%`, Status: of.status }));
    exportToJson(exportData, `projeto_ofs_${projeto?.nome}`);
  };

  const onExportExcel = () => {
    if (!projeto) return;
    exportProjectExcelWithTasks(projeto.nome, projeto.cliente, ofs, `Obras_${projeto.nome}`);
  };

  const handleArquivar = () => setArchiveModalOpen(true);

  const confirmArquivar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (archiveProgress < 100) return;
    try {
      await arquivarProjeto(projetoId);
      useAppStore.getState().incrementDataVersion();
      toast.success("Projeto arquivado!");
      useAppStore.getState().setSelectedProject(null);
    } catch(e: any) { toast.error(e.message) }
  };

  const handleApagar = () => {
    setDeleteModalOpen(true);
    setDeleteInputName("");
  };

  const confirmApagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto) return;
    if (deleteInputName === projeto.nome) {
       try {
         await deleteProjeto(projetoId);
         useAppStore.getState().incrementDataVersion();
         toast.success("Obra mestre apagada permanentemente.");
         useAppStore.getState().setSelectedProject(null);
       } catch(e: any) { toast.error(e.message) }
    } else {
       toast.error("O texto inserido não coincide com o nome da obra. Tente novamente.");
    }
  };


  const formatPrazo = (prazo: string | null | undefined) => {
    if (!prazo) return null;
    const d = new Date(prazo);
    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const label = d.toLocaleDateString('pt-PT');
    if (diffDays < 0) return { label, color: 'text-red-400', badge: 'Expirado' };
    if (diffDays <= 7) return { label, color: 'text-amber-400', badge: `${diffDays}d` };
    return { label, color: 'text-slate-400', badge: null };
  };

  if (loading) return <div className="p-8 text-slate-400">A carregar projeto...</div>;
  if (!projeto) return <div className="p-8 text-slate-400">Projeto não encontrado.</div>;


  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main scrollable area ── */}
      <div className="flex-1 min-w-0 p-8 pb-32 overflow-auto relative">
      <Modal isOpen={archiveModalOpen} title="Arquivar Projeto" onClose={() => setArchiveModalOpen(false)}>
        <form onSubmit={confirmArquivar} className="flex flex-col gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg text-sm">
            <span className="font-bold">Aviso:</span> O projeto será movido para o arquivo inativo. As ordens de fabrico e tarefas são mantidas e podem ser consultadas no arquivo. Aguarde para confirmar.
          </div>
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-amber-500 transition-all ease-linear" style={{ width: `${archiveProgress}%`, transitionDuration: archiveProgress === 0 ? '0ms' : '30ms' }} />
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button type="button" onClick={() => setArchiveModalOpen(false)} className="w-1/3 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg p-3 transition-colors border border-slate-700">Cancelar</button>
            <button type="submit" disabled={archiveProgress < 100} className="flex-1 text-sm bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-medium rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
               {archiveProgress < 100 ? `A preparar selagem... ${archiveProgress}%` : "Confirmar Arquivo"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} title="Apagar Obra Mestre" onClose={() => setDeleteModalOpen(false)}>
        <form onSubmit={confirmApagar} className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
            <span className="font-bold">Aviso Crítico:</span> Esta ação apagará permanentemente a obra e todos os dados associados (OFs e tarefas). Este passo é irreversível.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Para confirmar, escreva o nome exato da obra: <strong className="text-slate-200">"{projeto.nome}"</strong></label>
            <input autoFocus type="text" required value={deleteInputName} onChange={e => setDeleteInputName(e.target.value)} placeholder="Nome da Obra Mestre" className="w-full bg-slate-950 border border-red-900/50 text-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" />
          </div>
          <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-medium rounded-lg p-3 transition-all">Confirmar Eliminação Global</button>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} title="Nova Ordem de Fabrico" onClose={() => setModalOpen(false)}>
        <form onSubmit={submitOf} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Número da OF</label>
            <input autoFocus={!isGs0000} type="text" required value={newOfNumber} onChange={e => !isGs0000 && setNewOfNumber(e.target.value)} readOnly={isGs0000} placeholder="ex: 2026XXXX" className={cn("w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all", isGs0000 && "cursor-not-allowed opacity-60 select-all font-mono tracking-widest")} />
            {isGs0000 && <p className="text-[10px] text-slate-500 mt-1">Numeração automática sequencial — GS0000</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nome/Descrição da OF</label>
            <input autoFocus={isGs0000} type="text" required value={newOfName} onChange={e => setNewOfName(e.target.value)} placeholder="ex: Produção Cadeira XPTO" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Prazo Limite <span className="text-slate-600 font-normal">(Opcional)</span></label>
            <div className="relative">
              <CalendarClock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input type="date" value={newOfPrazo} onChange={e => setNewOfPrazo(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg pl-9 pr-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all" />
            </div>
          </div>
          <button disabled={creating} type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-white font-medium rounded-lg p-3 transition-all disabled:opacity-50">{creating ? "A Criar..." : "Salvar Ordem"}</button>
        </form>
      </Modal>

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-xs text-sky-400 font-medium tracking-widest uppercase mb-2">DETALHES DO PROJETO {projeto.arquivado && <span className="text-amber-500 ml-2">(ARQUIVADO)</span>}</div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">{projeto.nome}</h2>
          <div className="text-slate-400 mt-1">Cliente: <span className="text-slate-300">{projeto.cliente}</span></div>
        </div>
        <div className="flex gap-2">
          {!projeto.arquivado && <button onClick={handleArquivar} className="flex items-center gap-2 px-3 py-2 bg-amber-600/10 text-amber-500 hover:bg-amber-600/20 active:scale-95 text-sm font-medium rounded-lg transition-all border border-amber-500/20"><Archive size={16} /> Arquivar</button>}
          <button onClick={handleApagar} className="flex items-center gap-2 px-3 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 active:scale-95 text-sm font-medium rounded-lg transition-all border border-red-500/20"><Trash2 size={16} /> Apagar</button>
          <div className="w-px bg-slate-700/50 mx-2" />
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-sm font-medium border border-slate-700 rounded-lg transition-all"><FileDown size={16} /> Exportar</button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
              <button onClick={onExportExcel} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-emerald-400 font-medium text-sm border-b border-slate-700/50 transition-colors">Excel <span className="text-[10px] text-emerald-500/50 border border-emerald-500/30 px-1 rounded">XLSX</span></button>
              <button onClick={onExportJson} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 text-sm transition-colors">Backup <span className="text-[10px] text-slate-500 border border-slate-600 px-1 rounded">JSON</span></button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(max(250px, calc(33.333% - 16px)), 1fr))' }}>
        <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
          <div className="text-sm text-slate-400 mb-1">Total de OFs</div>
          <div className="text-3xl font-light text-slate-100">{ofs.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
          <div className="text-sm text-slate-400 mb-1">OFs Concluídas</div>
          <div className="text-3xl font-light text-sky-400">{ofs.filter(o => o.progress === 100).length}</div>
        </div>
      </div>



      <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-medium text-slate-200">Ordens de Fabrico</h3>
          {!projeto.arquivado && <button onClick={openNewOfModal} disabled={creating} className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"><PlusCircle size={16} /> Nova OF</button>}
        </div>
        {ofs.length === 0 ? <div className="p-12 text-center text-slate-500">Nenhuma Ordem de Fabrico registada.</div> : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 font-medium tracking-wider">
              <tr><th className="px-4 py-3">Nº OF</th><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Prazo</th><th className="px-4 py-3">Progresso</th><th className="px-4 py-3 text-right">Ação</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ofs.map((of) => {
                const prazo = formatPrazo(of.prazo_limite);
                return (
                  <tr key={of.id} onClick={() => useAppStore.getState().setSelectedOf(of.id)} className="hover:bg-slate-800/80 transition-colors cursor-pointer group">
                    <td className="px-4 py-3 font-mono text-sky-400">{of.numero_of}</td>
                    <td className="px-4 py-3 font-medium text-slate-200">{of.nome_of}</td>
                    <td className="px-4 py-3">{prazo ? <div className={cn("flex items-center gap-1.5", prazo.color)}><CalendarClock size={13} /><span>{prazo.label}</span></div> : "—"}</td>
                    <td className="px-4 py-3 w-56"><div className="flex items-center gap-3"><div className="w-full bg-slate-700 rounded-full h-1.5 flex-1 overflow-hidden"><div className={cn("h-1.5 rounded-full transition-all duration-500", of.progress === 100 ? "bg-emerald-400" : "bg-sky-500")} style={{ width: `${of.progress}%` }}></div></div><span className="text-xs font-medium text-slate-400 w-8">{of.progress}%</span></div></td>
                    <td className="px-4 py-3 text-right"><button className="text-sky-500 group-hover:text-sky-300 font-medium">Abrir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      </div>

      {/* ── Sidebar: Notas das OFs ── */}
      <div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/40 flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900/60">
          <StickyNote size={15} className="text-amber-400" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300">Notas das OFs</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {ofs.filter(o => o.notas).length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Sem notas registadas nas Ordens de Fabrico.</div>
          ) : (
            <div className="flex flex-col divide-y divide-slate-800/60">
              {ofs.filter(o => o.notas).map(o => (
                <div 
                  key={o.id} 
                  className="p-5 hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  onClick={() => useAppStore.getState().setSelectedOf(o.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-sky-400 font-semibold bg-sky-500/10 px-1.5 py-0.5 rounded">{o.numero_of}</span>
                    <span className="text-[11px] text-slate-400 truncate ml-2 text-right">{o.nome_of}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap group-hover:text-slate-200 transition-colors">{o.notas}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
