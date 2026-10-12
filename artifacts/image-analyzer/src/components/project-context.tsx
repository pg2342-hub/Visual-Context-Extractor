import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import type { ClientProject } from "@workspace/api-client-react";

interface ProjectContextValue {
  projects: ClientProject[];
  isLoading: boolean;
  error: Error | null;
  selectedProject: ClientProject | null;
  selectProject: (id: number | null) => void;
  refreshProjects: () => Promise<void>;
  projectsQueryKey: readonly unknown[];
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

async function loadProjects(): Promise<ClientProject[]> {
  const response = await fetch("/api/projects", { credentials: "include" });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Sign in to view client projects."
        : "Could not load client projects.",
    );
  }
  const body = (await response.json()) as { projects: ClientProject[] };
  return body.projects;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();
  const ownerId = user?.id ?? null;
  const storageKey = ownerId ? `image-context.active-project.${ownerId}` : null;
  const projectsQueryKey = useMemo(
    () => ["client-projects", ownerId] as const,
    [ownerId],
  );
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: loadProjects,
    enabled: isLoaded && Boolean(isSignedIn),
  });

  useEffect(() => {
    if (!storageKey) {
      setSelectedProjectId(null);
      return;
    }
    const savedId = Number(window.localStorage.getItem(storageKey));
    setSelectedProjectId(Number.isInteger(savedId) && savedId > 0 ? savedId : null);
  }, [storageKey]);

  useEffect(() => {
    if (!projectsQuery.isSuccess) return;
    if (
      selectedProjectId !== null &&
      !projectsQuery.data.some((project) => project.id === selectedProjectId)
    ) {
      setSelectedProjectId(null);
      if (storageKey) window.localStorage.removeItem(storageKey);
    }
  }, [projectsQuery.data, projectsQuery.isSuccess, selectedProjectId, storageKey]);

  const selectProject = useCallback(
    (id: number | null) => {
      setSelectedProjectId(id);
      if (!storageKey) return;
      if (id === null) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, String(id));
    },
    [storageKey],
  );

  const refreshProjects = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
  }, [projectsQueryKey, queryClient]);

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects: projectsQuery.data ?? [],
      isLoading: isLoaded && Boolean(isSignedIn) && projectsQuery.isPending,
      error: projectsQuery.error instanceof Error ? projectsQuery.error : null,
      selectedProject:
        projectsQuery.data?.find((project) => project.id === selectedProjectId) ??
        null,
      selectProject,
      refreshProjects,
      projectsQueryKey,
    }),
    [
      isLoaded,
      isSignedIn,
      projectsQuery.data,
      projectsQuery.error,
      projectsQuery.isPending,
      projectsQueryKey,
      refreshProjects,
      selectProject,
      selectedProjectId,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const value = useContext(ProjectContext);
  if (!value) {
    throw new Error("useProjects must be used inside ProjectProvider.");
  }
  return value;
}
