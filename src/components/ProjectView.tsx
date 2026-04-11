import { useEffect, useState } from 'react';
import { createOF, deleteProjeto, arquivarProjeto, updateProjetoNotas, Projeto, OrdemFabrico } from '../services/api';
import { supabase } from '../supabaseClient';
import { exportToJson, exportProjectExcelWithTasks } from '../lib/exportUtils';
import { FileDown, PlusCircle, Archive, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Modal } from './Modal';

interface OFWithProgress extends OrdemFabrico {
  tarefas: { concluido: boolean }[];
  progress: number;
}

export function ProjectView({ projetoId }: { projetoId: number }) {

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [ofs, setOfs] = useState<OFWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [notas, setNotas] = useState("");
  const [initialNotas, setInitialNotas] = useState("");

  // Fetch Project & OFs with Tasks
  const loadData = async () => {
    setLoading(true);
    
    // 1. Get Project info
    const { data: projData } = await supabase.from('projectos').select('*').eq('id', projetoId).single();
    if (projData) {
      setProjeto(projData);
      setNotas(projData.informacoes_gerais || "");
      setInitialNotas(projData.informacoes_gerais || "");
    }

    // 2. Get OFs and their Tasks to calc progress
    const { data: ofData } = await supabase
      .from('ordens_fabrico')
      .select('*, tarefas(*)')
      .eq('projeto_id', projetoId)
      .order('criado_em', { ascending: false });

    if (ofData) {
      const formatted = ofData.map((d: any) => {
        const total = d.tarefas?.length || 1;
        const concluidas = d.tarefas?.filter((t: any) => t.concluido).length || 0;
        return {
          ...d,
          progress: Math.round((concluidas / total) * 100)
        };
      });

      // Ordenar: Abertas no topo (progress < 100), Concluídas no fim (progress === 100)
      formatted.sort((a: any, b: any) => {
         const aDone = a.progress === 100 ? 1 : 0;
         const bDone = b.progress === 100 ? 1 : 0;
         if (aDone !== bDone) return aDone - bDone;
         // Both open/closed. Order oldest first (a.criado_em < b.criado_em)
         return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
      });

      setOfs(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [projetoId]);

  const [modalOpen, setModalOpen] = useState(false);
  const [newOfName, setNewOfName] = useState("");
  const [newOfNumber, setNewOfNumber] = useState("");

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
      }, 20); // 100 steps * 20ms = 2000ms = 2 seconds
    }
    return () => clearInterval(interval);
  }, [archiveModalOpen]);

  const submitOf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfName || !newOfNumber) return;
    try {
      setCreating(true);
      await createOF(projetoId, newOfName, newOfNumber);
      await loadData();
      setModalOpen(false);
      setNewOfName("");
      setNewOfNumber("");
    } catch (e: any) {
      alert("Erro ao criar: " + e.message);
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

  const handleArquivar = () => {
    setArchiveModalOpen(true);
  }

  const confirmArquivar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (archiveProgress < 100) return;
    try {
      await arquivarProjeto(projetoId);
      useAppStore.getState().setSelectedProject(null);
    } catch(e: any) { alert(e.message) }
  }

  const handleApagar = () => {
    setDeleteModalOpen(true);
    setDeleteInputName("");
  }

  const confirmApagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projeto) return;
    if (deleteInputName === projeto.nome) {
       try {
         await deleteProjeto(projetoId);
         useAppStore.getState().setSelectedProject(null);
       } catch(e: any) { alert(e.message) }
    } else {
       alert("O texto inserido não coincide com o nome da obra. Tente novamente.");
    }
  }

  const handleBlurNotas = async () => {
    if (notas !== initialNotas && projeto) {
      try {
        await updateProjetoNotas(projeto.id, notas);
        setInitialNotas(notas);
      } catch (e: any) {
        alert("Erro ao guardar notas: " + e.message);
      }
    }
  };

  if (loading) return <div className="p-8 text-slate-400">A carregar projeto...</div>;
  if (!projeto) return <div className="p-8 text-slate-400">Projeto não encontrado.</div>;

  return (
    <div className="p-8 pb-32 h-full overflow-auto relative">
      <Modal isOpen={archiveModalOpen} title="Arquivar Projeto" onClose={() => setArchiveModalOpen(false)}>
        <form onSubmit={confirmArquivar} className="flex flex-col gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-lg text-sm">
            <span className="font-bold">Aviso:</span> O projeto será movido para o arquivo inativo. Para garantir segurança, por favor aguarde.
          </div>
          
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="h-full bg-amber-500 transition-all ease-linear"
              style={{ width: `${archiveProgress}%`, transitionDuration: archiveProgress === 0 ? '0ms' : '30ms' }}
            />
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button 
              type="button"
              onClick={() => setArchiveModalOpen(false)}
              className="w-1/3 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg p-3 transition-colors border border-slate-700"
            >
               Cancelar
            </button>
            <button 
              type="submit" 
              disabled={archiveProgress < 100}
              className="flex-1 text-sm bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {archiveProgress < 100 ? `A preparar selagem... ${archiveProgress}%` : "Confirmar Arquivo"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} title="Apagar Obra Mestre" onClose={() => setDeleteModalOpen(false)}>
        <form onSubmit={confirmApagar} className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
            <span className="font-bold">Aviso Crítico:</span> Ao carregar neste botão submeter, fechará literalmente todas as Ordens de Fabrico e as tarefas abaixo destas permanentemente.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Para confirmar, escreva o nome exato da obra: <strong className="text-slate-200">"{projeto.nome}"</strong></label>
            <input 
              autoFocus
              type="text" 
              required
              value={deleteInputName}
              onChange={e => setDeleteInputName(e.target.value)}
              placeholder="Nome da Obra Mestre"
              className="w-full bg-slate-950 border border-red-900/50 text-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all"
            />
          </div>
          <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg p-3 transition-colors">
             Confirmar Eliminação Global
          </button>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} title="Nova Ordem de Fabrico" onClose={() => setModalOpen(false)}>
        <form onSubmit={submitOf} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Número da O.F.</label>
            <input 
              autoFocus
              type="text" 
              required
              value={newOfNumber}
              onChange={e => setNewOfNumber(e.target.value)}
              placeholder="ex: 2026XXXX"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nome/Descrição da O.F.</label>
            <input 
              type="text" 
              required
              value={newOfName}
              onChange={e => setNewOfName(e.target.value)}
              placeholder="ex: Produção Cadeira XPTO"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all"
            />
          </div>
          <button disabled={creating} type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg p-3 transition-colors disabled:opacity-50">
            {creating ? "A Criar..." : "Salvar Ordem"}
          </button>
        </form>
      </Modal>

      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-xs text-sky-400 font-medium tracking-widest uppercase mb-2">
            DETALHES DO PROJETO {projeto.arquivado && <span className="text-amber-500 ml-2">(ARQUIVADO)</span>}
          </div>
          <h2 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            {projeto.nome}
          </h2>
          <div className="text-slate-400 mt-1">Cliente: <span className="text-slate-300">{projeto.cliente}</span></div>
        </div>
        <div className="flex gap-2">
          {!projeto.arquivado && (
            <button onClick={handleArquivar} className="flex items-center gap-2 px-3 py-2 bg-amber-600/10 text-amber-500 hover:bg-amber-600/20 text-sm font-medium rounded-lg transition-colors border border-amber-500/20">
              <Archive size={16} /> Arquivar
            </button>
          )}
          <button onClick={handleApagar} className="flex items-center gap-2 px-3 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 text-sm font-medium rounded-lg transition-colors border border-red-500/20">
            <Trash2 size={16} /> Apagar
          </button>
          <div className="w-px bg-slate-700/50 mx-2" />
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 rounded-lg transition-colors">
              <FileDown size={16} /> Exportar
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
              <button onClick={onExportExcel} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-emerald-400 font-medium text-sm border-b border-slate-700/50 transition-colors">
                 Excel <span className="text-[10px] text-emerald-500/50 border border-emerald-500/30 px-1 rounded">XLSX</span>
              </button>
              <button onClick={onExportJson} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 text-sm transition-colors">
                 Backup <span className="text-[10px] text-slate-500 border border-slate-600 px-1 rounded">JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
          <div className="text-sm text-slate-400 mb-1">Total de OFs</div>
          <div className="text-3xl font-light text-slate-100">{ofs.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-2xl">
          <div className="text-sm text-slate-400 mb-1">OFs Concluídas</div>
          <div className="text-3xl font-light text-sky-400">{ofs.filter(o => o.progress === 100).length}</div>
        </div>
      </div>

      {/* NOTAS GERAIS */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Informações Gerais
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          onBlur={handleBlurNotas}
          disabled={projeto.arquivado}
          placeholder="Insira aqui as notas, detalhes ou observações relevantes sobre esta obra..."
          className="w-full bg-slate-800/30 border border-slate-700 text-slate-200 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all resize-y disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* TABLE */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
          <h3 className="text-lg font-medium text-slate-200">Ordens de Fabrico</h3>
          {!projeto.arquivado && (
            <button 
              onClick={() => setModalOpen(true)}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <PlusCircle size={16} />
              Nova O.F.
            </button>
          )}
        </div>
        
        {ofs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Nenhuma Ordem de Fabrico registada neste projeto.
          </div>
        ) : (
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 font-medium tracking-wider">
              <tr>
                <th className="px-6 py-4">Nº O.F.</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Progresso Geral</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ofs.map((of) => (
                <tr 
                  key={of.id} 
                  onClick={() => useAppStore.getState().setSelectedOf(of.id)}
                  className="hover:bg-slate-800/80 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-mono text-sky-400 group-hover:text-sky-300 transition-colors">{of.numero_of}</td>
                  <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-white transition-colors">{of.nome_of}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(of.criado_em).toLocaleDateString()}</td>
                  <td className="px-6 py-4 w-64">
                    <div className="flex items-center gap-3">
                      <div className="w-full bg-slate-700 rounded-full h-1.5 flex-1 overflow-hidden">
                        <div 
                          className={cn("h-1.5 rounded-full transition-all duration-500", of.progress === 100 ? "bg-emerald-400" : "bg-sky-500")} 
                          style={{ width: `${of.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-slate-400 w-8">{of.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      className="text-sky-500 group-hover:text-sky-300 px-3 py-1 bg-sky-500/0 group-hover:bg-sky-500/20 rounded font-medium transition-all group-active:scale-95 duration-200"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


