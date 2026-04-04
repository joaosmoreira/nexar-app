import { create } from 'zustand';

interface AppState {
  selectedProjectId: number | null;
  selectedOfId: number | null;
  isArchiveMode: boolean;
  isSearchOpen: boolean;
  setSelectedProject: (id: number | null) => void;
  setSelectedOf: (id: number | null) => void;
  setArchiveMode: (active: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProjectId: null,
  selectedOfId: null,
  isArchiveMode: false,
  isSearchOpen: false,
  setSelectedProject: (id) => set({ selectedProjectId: id, selectedOfId: null, isArchiveMode: false }),
  setSelectedOf: (id) => set({ selectedOfId: id, isArchiveMode: false }),
  setArchiveMode: (active) => set({ isArchiveMode: active, selectedProjectId: null, selectedOfId: null }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
