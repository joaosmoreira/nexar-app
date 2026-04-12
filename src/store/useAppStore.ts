import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  session: Session | null;
  selectedProjectId: number | null;
  selectedOfId: number | null;
  isArchiveMode: boolean;
  isSearchOpen: boolean;

  // Offline / sync state
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: string | null;
  hasPendingMutations: boolean;

  // Global Refresh Bus
  dataVersion: number;

  setUser: (user: User | null, session: Session | null) => void;
  setSelectedProject: (id: number | null) => void;
  setSelectedOf: (id: number | null) => void;
  setArchiveMode: (active: boolean) => void;
  setSearchOpen: (open: boolean) => void;

  setOnlineStatus: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setLastSyncAt: (ts: string) => void;
  setPendingMutations: (has: boolean) => void;
  
  incrementDataVersion: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  session: null,
  selectedProjectId: null,
  selectedOfId: null,
  isArchiveMode: false,
  isSearchOpen: false,

  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncAt: null,
  hasPendingMutations: false,
  dataVersion: 0,

  setUser: (user, session) => set({ user, session }),
  setSelectedProject: (id) => set({ selectedProjectId: id, selectedOfId: null, isArchiveMode: false }),
  setSelectedOf: (id) => set({ selectedOfId: id, isArchiveMode: false }),
  setArchiveMode: (active) => set({ isArchiveMode: active, selectedProjectId: null, selectedOfId: null }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),

  setOnlineStatus: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
  setPendingMutations: (has) => set({ hasPendingMutations: has }),
  incrementDataVersion: () => set((state) => ({ dataVersion: state.dataVersion + 1 })),
}));
