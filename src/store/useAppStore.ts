import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

interface AppState {
  user: User | null;
  session: Session | null;
  selectedProjectId: number | null;
  selectedOfId: number | null;
  isArchiveMode: boolean;
  isSearchOpen: boolean;
  setUser: (user: User | null, session: Session | null) => void;
  setSelectedProject: (id: number | null) => void;
  setSelectedOf: (id: number | null) => void;
  setArchiveMode: (active: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  session: null,
  selectedProjectId: null,
  selectedOfId: null,
  isArchiveMode: false,
  isSearchOpen: false,
  setUser: (user, session) => set({ user, session }),
  setSelectedProject: (id) => set({ selectedProjectId: id, selectedOfId: null, isArchiveMode: false }),
  setSelectedOf: (id) => set({ selectedOfId: id, isArchiveMode: false }),
  setArchiveMode: (active) => set({ isArchiveMode: active, selectedProjectId: null, selectedOfId: null }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
