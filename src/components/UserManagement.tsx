import { useEffect, useState } from 'react';
import { fetchAllUsers, updateUserRole, UserWithRole, UserRole } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { Users, ShieldCheck, ShieldOff, RefreshCw, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export function UserManagement() {
  const { user: currentUser, setUserMgmtOpen, setViewingUser } = useAppStore();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch (e: any) {
      toast.error('Erro ao carregar utilizadores: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleRole = async (u: UserWithRole) => {
    if (u.user_id === currentUser?.id) {
      toast.error('Não podes alterar o teu próprio role.');
      return;
    }
    const newRole: UserRole = u.role === 'admin' ? 'user' : 'admin';
    setUpdatingId(u.user_id);
    try {
      await updateUserRole(u.user_id, newRole);
      setUsers(prev =>
        prev.map(x => (x.user_id === u.user_id ? { ...x, role: newRole } : x))
      );
      toast.success(`Role de ${u.email} atualizado para "${newRole}".`);
    } catch (e: any) {
      toast.error('Erro ao atualizar role: ' + e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Users size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-100">Gestão de Equipa</h1>
            <p className="text-xs text-slate-500">Gere os acessos e roles dos membros da equipa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all active:scale-90 disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setUserMgmtOpen(false)}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-90"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-8 py-3 border-b border-slate-800 flex items-center gap-6 shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={14} className="text-violet-400" />
          <span><span className="text-violet-300 font-medium">Admin</span> — Acesso total a todos os projetos e gestão de equipa</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldOff size={14} className="text-sky-400" />
          <span><span className="text-sky-300 font-medium">User</span> — Acesso apenas aos seus próprios projetos</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 gap-3 text-slate-500">
            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            A carregar utilizadores...
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            Nenhum utilizador encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => {
              const isCurrentUser = u.user_id === currentUser?.id;
              const isUpdating = updatingId === u.user_id;
              const isAdmin = u.role === 'admin';

              return (
                <div
                  key={u.user_id}
                  onClick={() => {
                    setViewingUser(u.user_id, u.nome || u.email.split('@')[0]);
                    setUserMgmtOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 rounded-xl border transition-all cursor-pointer hover:shadow-lg',
                    isCurrentUser
                      ? 'bg-slate-800/40 border-slate-700/60'
                      : 'bg-slate-800/20 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  )}
                  title="Ver Dashboard deste utilizador"
                >
                  {/* Avatar placeholder */}
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                    isAdmin
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  )}>
                    {(u.nome || u.email)[0].toUpperCase()}
                  </div>

                  {/* Detalhes (Nome e Email) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-200 truncate">{u.nome || u.email.split('@')[0]}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-medium shrink-0">Tu</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">{u.email}</div>
                  </div>

                  {/* Role Badge */}
                  <div className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0',
                    isAdmin
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                      : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  )}>
                    {isAdmin
                      ? <><ShieldCheck size={12} /> Admin</>
                      : <><ShieldOff size={12} /> User</>
                    }
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleRole(u); }}
                    disabled={isCurrentUser || isUpdating}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 shrink-0',
                      isCurrentUser || isUpdating
                        ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                        : isAdmin
                          ? 'bg-slate-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-slate-700 text-slate-400'
                          : 'bg-slate-800 hover:bg-violet-500/10 hover:text-violet-300 hover:border-violet-500/20 border border-slate-700 text-slate-400'
                    )}
                    title={isCurrentUser ? 'Não podes alterar o teu próprio role' : isAdmin ? 'Remover Admin' : 'Promover a Admin'}
                  >
                    {isUpdating ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : isAdmin ? (
                      <><ShieldOff size={12} /> Revogar</>
                    ) : (
                      <><ShieldCheck size={12} /> Promover</>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="px-8 py-3 border-t border-slate-800 shrink-0">
        <p className="text-[11px] text-slate-600">
          {users.length} utilizador(es) registado(s) · As alterações de role têm efeito imediato
        </p>
      </div>
    </div>
  );
}
