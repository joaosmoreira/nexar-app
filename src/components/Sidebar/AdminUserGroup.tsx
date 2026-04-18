import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Projeto, UserWithRole } from '../../services/api';
import { cn } from '../../lib/utils';
import { ProjectItem } from './ProjectItem';

interface AdminUserGroupProps {
  userInfo: UserWithRole;
  projetos: Projeto[];
  deadlineProjectIds: number[];
  completedProjectIds: number[];
}

export function AdminUserGroup({ userInfo, projetos, deadlineProjectIds, completedProjectIds }: AdminUserGroupProps) {
  const [expanded, setExpanded] = useState(false);
  // Seletor granular para o ID do utilizador atual
  const currentUserId = useAppStore(s => s.user?.id);
  const isCurrentUser = userInfo.user_id === currentUserId;
  const emailLabel = userInfo.email.split('@')[0];

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all group",
          expanded ? "bg-violet-500/10 text-violet-300" : "hover:bg-slate-800/50 text-slate-400"
        )}
      >
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded && "rotate-90"
          )}
        />
        <div className={cn(
          "w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0",
          isCurrentUser
            ? "bg-violet-500/15 text-violet-300 border border-violet-500/25"
            : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
        )}>
          {emailLabel[0].toUpperCase()}
        </div>
        <div className="flex-1 text-left truncate">
          <div className="text-[12px] font-medium truncate">{emailLabel}</div>
          <div className="text-[10px] opacity-50 truncate">{projetos.length} obra{projetos.length !== 1 ? 's' : ''}</div>
        </div>
        {isCurrentUser && (
          <span className="text-[9px] text-violet-400/60 bg-violet-500/10 px-1.5 py-0.5 rounded font-medium shrink-0">Tu</span>
        )}
      </button>

      {/* Container com transição suave para grupos de admin */}
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0"
        )}
      >
        <div className="ml-3 pl-3 border-l border-slate-800 space-y-0.5 overflow-hidden">
          {projetos.length === 0 ? (
            <div className="text-[11px] text-slate-600 px-3 py-2">Sem obras</div>
          ) : (
            projetos.map(p => (
              <ProjectItem 
                key={p.id} 
                projeto={p} 
                deadlineProjectIds={deadlineProjectIds} 
                completedProjectIds={completedProjectIds} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
