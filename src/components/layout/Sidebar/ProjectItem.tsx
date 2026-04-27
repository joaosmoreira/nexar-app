import { useEffect, useState } from 'react';
import { Folder, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { fetchOfsByProjeto, Projeto, OrdemFabrico } from '@/services/api';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OfItem } from './OfItem';

export interface ProjectItemProps {
  projeto: Projeto;
  deadlineProjectIds: number[];
  completedProjectIds: number[];
  isSortable?: boolean;
}

export function ProjectItem({ projeto, deadlineProjectIds, completedProjectIds, isSortable = false }: ProjectItemProps) {
  // Seletor granular para evitar re-renders do componente quando OFs de outros projetos mudam
  const selectedProjectId = useAppStore(s => s.selectedProjectId);
  const selectedOfId = useAppStore(s => s.selectedOfId);
  const setSelectedProject = useAppStore(s => s.setSelectedProject);
  const addOfsToStore = useAppStore(s => s.addOfs);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: projeto.id,
    disabled: !isSortable 
  });
  
  const [ofs, setOfs] = useState<OrdemFabrico[]>([]);
  const [loading, setLoading] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSelected = selectedProjectId === projeto.id && selectedOfId === null;
  const isExpanded = selectedProjectId === projeto.id;

  // Carrega OFs apenas se expandido
  useEffect(() => {
    if (isExpanded) {
      setLoading(true);
      fetchOfsByProjeto(projeto.id).then(data => {
        const formatted = data.map((d: any) => {
          const total = d.tarefas?.length || 1;
          const concluidas = d.tarefas?.filter((t: any) => t.concluido).length || 0;
          return { ...d, progress: Math.round((concluidas / total) * 100) };
        });

        formatted.sort((a: any, b: any) => {
           const aDone = a.progress === 100 ? 1 : 0;
           const bDone = b.progress === 100 ? 1 : 0;
           if (aDone !== bDone) return aDone - bDone;
           return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
        });

        setOfs(formatted);
        addOfsToStore(formatted); // Cache global
        setLoading(false);
      });
    }
  }, [isExpanded, projeto.id]);

  const [ref, ...rest] = projeto.nome.split(" - ");
  const projNameOnly = rest.length > 0 ? rest.join(" - ") : (projeto.cliente || projeto.nome);

  const allDone = completedProjectIds.includes(projeto.id);
  const allDoneLocal = ofs.length > 0 && ofs.every((o: any) => o.progress === 100);
  const isCompleted = allDone || (isExpanded && allDoneLocal);
  const hasDeadlineSoon = deadlineProjectIds.includes(projeto.id);

  let folderIcon;
  if (isCompleted) {
    folderIcon = <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />;
  } else if (hasDeadlineSoon) {
    folderIcon = <AlertTriangle size={18} className={cn("shrink-0 transition-colors", isSelected ? "text-amber-400" : "text-amber-500")} />;
  } else {
    folderIcon = <Folder size={18} className={cn("shrink-0 transition-colors", isSelected ? "text-sky-400" : "text-sky-500/50")} />;
  }

  return (
    <div className="mb-2" ref={setNodeRef} style={style}>
      <button
        onClick={() => setSelectedProject(projeto.id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group select-none",
          isSelected ? "bg-slate-800 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
        )}
        {...attributes}
        {...listeners}
      >
        {folderIcon}
        <div className="flex-1 text-left truncate pointer-events-none">
           <div className="text-[10px] font-bold tracking-widest uppercase text-sky-500/70 mb-0.5">{ref}</div>
           <div className="text-[13px] font-medium leading-tight truncate text-slate-300 group-hover:text-slate-100 transition-colors">{projNameOnly}</div>
        </div>
        {projeto.anexo_url && (
          <a
            href={projeto.anexo_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded transition-all shrink-0"
            title="Abrir Pasta da Cloud"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </button>

      {/* Container com transição suave de expansão */}
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0"
        )}
      >
        <div className="ml-[22px] pl-3 border-l border-slate-800 overflow-hidden space-y-1">
          {loading ? (
            <div className="text-xs text-slate-500 px-3 py-1">A carregar...</div>
          ) : ofs.length === 0 ? (
            <div className="text-xs text-slate-500 px-3 py-1">Sem ordens de fabrico</div>
          ) : (
            ofs.map((of) => (
              <OfItem key={of.id} ofData={of} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
