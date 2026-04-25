import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, User } from '@supabase/supabase-js';
import { UserRole, Projeto, OrdemFabrico } from '../services/api';

interface AppState {
  user: User | null;
  session: Session | null;
  selectedProjectId: number | null;
  selectedOfId: number | null;
  isArchiveMode: boolean;
  isSearchOpen: boolean;

  // RBAC
  userRole: UserRole;

  // Offline / sync state
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  hasPendingMutations: boolean;

  // Global Refresh Bus
  dataVersion: number;

  // Admin Panel
  isUserMgmtOpen: boolean;

  // Password Recovery
  isPasswordRecovery: boolean;

  // Cached Data for instant UI
  projects: Projeto[];
  ofs: OrdemFabrico[];
  setProjects: (projects: Projeto[]) => void;
  setOfs: (ofs: OrdemFabrico[]) => void;
  addOfs: (newOfs: OrdemFabrico[]) => void;

  setUser: (user: User | null, session: Session | null) => void;
  setSelectedProject: (id: number | null) => void;
  setSelectedOf: (id: number | null) => void;
  setArchiveMode: (active: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setUserRole: (role: UserRole) => void;
  setUserMgmtOpen: (open: boolean) => void;
  setPasswordRecovery: (active: boolean) => void;

  setOnlineStatus: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (ts: string) => void;
  setPendingMutations: (has: boolean) => void;
  
  incrementDataVersion: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  user: null,
  session: null,
  selectedProjectId: null,
  selectedOfId: null,
  isArchiveMode: false,
  isSearchOpen: false,
  isUserMgmtOpen: false,
  isPasswordRecovery: false,
  projects: [],
  ofs: [],

  userRole: 'user',

  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,
  hasPendingMutations: false,
  dataVersion: 0,

  setProjects: (projects) => set({ projects }),
  setOfs: (ofs) => set({ ofs }),
  addOfs: (newOfs) => set((state) => {
    const existingIds = new Set(state.ofs.map(o => o.id));
    const uniqueNewOfs = newOfs.filter(o => !existingIds.has(o.id));
    return { ofs: [...state.ofs, ...uniqueNewOfs] };
  }),
  setUser: (user, session) => set({ 
    user, 
    session, 
    selectedProjectId: null, 
    selectedOfId: null, 
    isUserMgmtOpen: false 
  }),
  setSelectedProject: (id) => set({ selectedProjectId: id, selectedOfId: null, isArchiveMode: false }),
  setSelectedOf: (id) => set({ selectedOfId: id, isArchiveMode: false }),
  setArchiveMode: (active) => set({ isArchiveMode: active, selectedProjectId: null, selectedOfId: null }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  setUserRole: (role) => set({ userRole: role }),
  setUserMgmtOpen: (open) => set({ isUserMgmtOpen: open }),
  setPasswordRecovery: (active) => set({ isPasswordRecovery: active }),

  setOnlineStatus: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
  setPendingMutations: (has) => set({ hasPendingMutations: has }),
  incrementDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
    }),
    {
      name: 'nexar-app-storage',
      partialize: (state) => ({
        projects: state.projects,
        ofs: state.ofs,
        dataVersion: state.dataVersion,
        lastSyncAt: state.lastSyncAt,
      }),
    }
  )
);
