import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  fetchProjetos, fetchProjetosArquivados, 
  fetchOfsWithDeadlineSoon, fetchProjectsCompletionStatus, fetchAllUsers,
  Projeto, UserWithRole 
} from '../services/api';

const DEADLINE_CACHE_KEY = 'nexar-deadline-cache';
const DEADLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface DeadlineCache {
  fetchedAt: number;
  projectIds: number[];
  completedProjectIds: number[];
}

function readDeadlineCache(): DeadlineCache | null {
  try {
    const raw = localStorage.getItem(DEADLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeadlineCache;
    if (!Array.isArray(parsed.completedProjectIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDeadlineCache(projectIds: number[], completedProjectIds: number[]) {
  const entry: DeadlineCache = { fetchedAt: Date.now(), projectIds, completedProjectIds };
  localStorage.setItem(DEADLINE_CACHE_KEY, JSON.stringify(entry));
}

export async function getProjectsStatusCache(forceRefresh = false): Promise<{ deadlineIds: number[]; completedIds: number[] }> {
  const cached = forceRefresh ? null : readDeadlineCache();
  if (cached && Date.now() - cached.fetchedAt < DEADLINE_CACHE_TTL_MS) {
    return { deadlineIds: cached.projectIds, completedIds: cached.completedProjectIds || [] };
  }
  const [ofs, completedIds] = await Promise.all([
    fetchOfsWithDeadlineSoon(),
    fetchProjectsCompletionStatus(),
  ]);
  const deadlineIds = [...new Set(ofs.map(o => o.projeto_id))];
  writeDeadlineCache(deadlineIds, completedIds);
  return { deadlineIds, completedIds };
}

export function useSidebarData() {
  const { isArchiveMode, userRole, dataVersion, setProjects: setStoreProjects } = useAppStore();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineProjectIds, setDeadlineProjectIds] = useState<number[]>([]);
  const [completedProjectIds, setCompletedProjectIds] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const isAdmin = userRole === 'admin';

  const loadProjetos = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { deadlineIds, completedIds } = await getProjectsStatusCache(!silent);
      setDeadlineProjectIds(deadlineIds);
      setCompletedProjectIds(completedIds);

      const data = isArchiveMode ? await fetchProjetosArquivados() : await fetchProjetos();
      setProjetos(data);
      setStoreProjects(data); // Atualiza o store global
      useAppStore.getState().setLastSyncAt(new Date().toISOString());
    } catch (error) {
      console.error("Erro ao carregar projetos:", error);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    getProjectsStatusCache()
      .then(({ deadlineIds, completedIds }) => {
        setDeadlineProjectIds(deadlineIds);
        setCompletedProjectIds(completedIds);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers().then(setAllUsers).catch(() => setAllUsers([]));
    }
  }, [isAdmin]);

  const firstLoad = useRef(true);
  const previousArchiveMode = useRef(isArchiveMode);

  useEffect(() => {
    const isSilent = previousArchiveMode.current === isArchiveMode && !firstLoad.current;
    loadProjetos(isSilent);
    firstLoad.current = false;
    previousArchiveMode.current = isArchiveMode;

    const syncInterval = setInterval(() => {
      const store = useAppStore.getState();
      if (store.isOnline && !store.hasPendingMutations) {
        store.setSyncing(true);
        loadProjetos(true).finally(() => {
           store.setSyncing(false);
        });
      }
    }, 60000);

    return () => clearInterval(syncInterval);
  }, [isArchiveMode, dataVersion]);

  return {
    projetos,
    setProjetos,
    loading,
    deadlineProjectIds,
    completedProjectIds,
    allUsers,
    loadProjetos,
    isAdmin
  };
}
