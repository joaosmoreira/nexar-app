import { FileCog, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import { OrdemFabrico } from '@/services/api';

interface OfItemProps {
  ofData: OrdemFabrico;
}

export function OfItem({ ofData }: OfItemProps) {
  const { selectedOfId, setSelectedOf } = useAppStore();
  const isSelected = selectedOfId === ofData.id;

  const progresso = ofData.tarefas && ofData.tarefas.length > 0 
    ? (ofData.tarefas.filter(t => t.concluido).length / ofData.tarefas.length) * 100 
    : 0;

  const ageMs = Date.now() - new Date(ofData.criado_em).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Verificar prazo limite
  const now = Date.now();
  const prazoMs = ofData.prazo_limite ? new Date(ofData.prazo_limite).getTime() - now : null;
  const prazoEmDias = prazoMs !== null ? prazoMs / (1000 * 60 * 60 * 24) : null;
  const prazoUrgente = prazoEmDias !== null && prazoEmDias <= 7 && prazoEmDias >= 0 && progresso < 100;
  const prazoExpirado = prazoEmDias !== null && prazoEmDias < 0 && progresso < 100;

  let iconToRender;
  if (progresso >= 100) {
     iconToRender = <CheckCircle2 size={16} className="text-emerald-500" />;
  } else if (prazoExpirado) {
     iconToRender = <AlertTriangle size={16} className="text-red-500" />;
  } else if (prazoUrgente) {
     iconToRender = <AlertTriangle size={16} className="text-amber-400" />;
  } else if (ageDays > 21) {
     iconToRender = <AlertTriangle size={16} className="text-red-500" />;
  } else if (ageDays > 14) {
     iconToRender = <AlertTriangle size={16} className="text-amber-500" />;
  } else {
     iconToRender = <FileCog size={16} className={cn("transition-colors", isSelected ? "text-amber-400" : "text-slate-500 group-hover:text-amber-400/50")} />;
  }

  return (
    <button
      onClick={() => setSelectedOf(ofData.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group",
        isSelected ? "bg-slate-800 text-slate-100" : "hover:bg-slate-800/50 text-slate-400"
      )}
    >
      <div className="relative shrink-0 flex items-center">
         {iconToRender}
      </div>

      <div className="flex-1 text-left truncate">
         <div className={cn("font-medium text-[12px] truncate", isSelected ? "text-white" : "text-slate-300 group-hover:text-white transition-colors")}>
            {ofData.numero_of}
         </div>
         <div className="text-[10px] uppercase tracking-wider opacity-60 truncate text-slate-400">{ofData.nome_of}</div>
      </div>
    </button>
  );
}
