import { useEffect, useState } from 'react';
import { Search, Folder, FileText, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { globalSearch } from '@/services/api';

export function GlobalSearchModal() {
  const { isSearchOpen, setSearchOpen, setSelectedProject, setSelectedOf } = useAppStore();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<{projetos: any[], ofs: any[]}>({ projetos: [], ofs: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSearchOpen) {
      setTerm('');
      setResults({ projetos: [], ofs: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (term.trim().length >= 2) {
        setLoading(true);
        try {
          const res = await globalSearch(term);
          setResults(res);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setResults({ projetos: [], ofs: [] });
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [term, isSearchOpen]);

  if (!isSearchOpen) return null;

  const navigateToProject = (id: number) => {
    setSelectedProject(id);
    setSearchOpen(false);
  };

  const navigateToOf = (projetoId: number, ofId: number) => {
    setSelectedProject(projetoId);
    setSelectedOf(ofId);
    setSearchOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/80 backdrop-blur-sm shadow-2xl">
      <div className="bg-slate-900 w-full max-w-2xl rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Search Header */}
        <div className="flex items-center px-4 py-4 border-b border-slate-800 bg-slate-900/50">
          <Search className="text-sky-500 mr-3 shrink-0" size={24} />
          <input 
            autoFocus
            type="text" 
            placeholder="Procure por GS1522, Lógica de Fachada, ou Número de OF..."
            className="flex-1 bg-transparent text-slate-200 text-lg outline-none placeholder:text-slate-500"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <button onClick={() => setSearchOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto flex-1 p-2 bg-slate-900">
          {term.trim().length < 2 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              Escreva pelo menos 2 letras ou números para pesquisar...
            </div>
          )}

          {term.trim().length >= 2 && loading && (
            <div className="p-8 text-center text-sky-500/70 text-sm animate-pulse">
              A pesquisar profundamente nas docas e arquivos...
            </div>
          )}

          {term.trim().length >= 2 && !loading && results.projetos.length === 0 && results.ofs.length === 0 && (
             <div className="p-8 text-center text-slate-500 text-sm">
               Nenhum resultado encontrado para "{term}".
             </div>
          )}

          {!loading && results.projetos.length > 0 && (
            <div className="mb-4">
              <div className="px-3 py-2 text-xs font-semibold text-sky-500/80 uppercase tracking-widest">
                Obras Mestras ({results.projetos.length})
              </div>
              <div className="flex flex-col">
                {results.projetos.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => navigateToProject(p.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-sky-500/10 text-left rounded-lg transition-colors group"
                  >
                     <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-sky-500/20 group-hover:text-sky-400 transition-colors">
                        <Folder size={16} className="text-slate-400 group-hover:text-sky-400" />
                     </div>
                     <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-slate-200 group-hover:text-white">
                          {p.cliente && p.cliente !== 'Desconhecido' && !p.nome.toLowerCase().includes(p.cliente.toLowerCase()) 
                            ? `${p.nome} - ${p.cliente}`
                            : p.nome}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.arquivado ? "Encontrado em: Modo Arquivo Histórico" : "Encontrado em: Obras Ativas"}</div>
                     </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && results.ofs.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-amber-500/80 uppercase tracking-widest mt-2">
                Ordens de Fabrico ({results.ofs.length})
              </div>
              <div className="flex flex-col">
                {results.ofs.map(o => (
                  <button 
                    key={o.id}
                    onClick={() => navigateToOf(o.projeto_id, o.id)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-amber-500/10 text-left rounded-lg transition-colors group"
                  >
                     <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
                        <FileText size={16} className="text-slate-400 group-hover:text-amber-400" />
                     </div>
                     <div className="flex-1 truncate">
                        <div className="text-sm font-medium text-slate-200 group-hover:text-white flex items-center gap-2">
                           {o.numero_of} <span className="text-slate-500">|</span> {o.nome_of}
                        </div>
                        <div className="text-[11px] font-bold tracking-widest uppercase text-sky-500/50 mt-1 truncate">
                           {(o as any).projectos?.nome || "Projeto Pai"}
                        </div>
                     </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-medium">
           <span>Pesquisa</span>
           <span>Pressione ESC para fechar ou clique [{navigator.userAgent.toLowerCase().includes('mac') ? 'CMD' : 'CTRL'} + K] para abrir e fechar a qualquer hora</span>
        </div>
      </div>
    </div>
  );
}
