import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import { Plus, Search } from "lucide-react";
import { ProjectAvatar } from "@/components/app-header";
import { useProjects } from "@/components/project-context";
import type { ClientProject } from "@workspace/api-client-react";

async function createProject(input: { name: string; description: string }) {
  const response = await fetch("/api/projects", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Could not create the project.");
  }
  return response.json() as Promise<ClientProject>;
}

export default function ProjectsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { projects, isLoading, error, selectProject, refreshProjects } = useProjects();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [showCreate, setShowCreate] = useState(() => new URLSearchParams(search).get("new") === "1");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await refreshProjects();
      selectProject(project.id);
      setLocation(`/projects/${project.id}/settings?tab=knowledge`);
    },
  });

  if (!isLoaded) {
    return <PageFrame><div className="space-y-4"><div className="h-8 w-56 animate-pulse rounded-md bg-subtle" /><div className="h-28 animate-pulse rounded-xl bg-subtle" /></div></PageFrame>;
  }

  if (!isSignedIn) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
          <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Client projects</h1>
          <p className="mt-1.5 text-[14px] leading-6 text-ink-2">
            Sign in to keep each client’s notes, documents and reviewed findings in its own project.
          </p>
          <Link href="/sign-in" className="mt-6 inline-flex h-9 items-center rounded-md bg-ink px-4 text-[14px] font-medium text-surface no-underline hover:opacity-85">
            Sign in
          </Link>
        </div>
      </PageFrame>
    );
  }

  const inputClass = "mt-1.5 h-10 w-full rounded-md border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-colors focus:border-ink-3 focus:ring-2 focus:ring-fact/20";
  const visible = projects.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <PageFrame>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-ink">Client projects</h1>
          <p className="mt-1 text-[14px] text-ink-2">One project per client keeps notes, documents and findings from mixing.</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[16rem] flex-1">
          <span className="sr-only">Search projects</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            className="h-10 w-full rounded-md border border-line-2 bg-surface pl-9 pr-3 text-[14px] text-ink outline-none transition-colors focus:border-ink-3 focus:ring-2 focus:ring-fact/20"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowCreate((visible) => !visible)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[14px] font-medium text-surface transition-opacity hover:opacity-85"
        >
          <Plus className="h-4 w-4" />
          New project
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate({ name: name.trim(), description: description.trim() });
          }}
          className="mb-6 overflow-hidden rounded-xl border border-line bg-surface shadow-card"
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <h2 className="text-[16px] font-semibold text-ink sm:col-span-2">New client project</h2>
            <label className="text-[13px] font-medium text-ink-2">
              Project name
              <input required autoFocus maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Northwind Freight" className={inputClass} />
            </label>
            <label className="text-[13px] font-medium text-ink-2">
              Short description <span className="font-normal text-ink-3">(optional)</span>
              <input maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Order-to-cash systems review" className={inputClass} />
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas px-5 py-3">
            {createMutation.isError && <span role="alert" className="mr-auto text-[13px] text-conflict">{createMutation.error.message}</span>}
            <button type="button" onClick={() => setShowCreate(false)} className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-ink-2 hover:bg-subtle hover:text-ink">Cancel</button>
            <button type="submit" disabled={!name.trim() || createMutation.isPending} className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[13px] font-medium text-surface hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40">
              {createMutation.isPending ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-4 text-[14px] text-conflict">{error.message}</p>}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-[132px] animate-pulse rounded-xl bg-subtle" />)}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-2 px-6 py-14 text-center">
          <h2 className="text-[16px] font-semibold text-ink">No client projects yet</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-6 text-ink-2">
            Create one per client. Then pick it from the switcher at the top before you analyze, and its findings stay with that client.
          </p>
          {!showCreate && (
            <button type="button" onClick={() => setShowCreate(true)} className="mt-6 inline-flex h-9 items-center rounded-md bg-ink px-4 text-[14px] font-medium text-surface hover:opacity-85">
              Create your first project
            </button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-2 px-6 py-10 text-center text-[14px] text-ink-2">No projects match “{query}”.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/settings?tab=memory`}
              onClick={() => selectProject(project.id)}
              className="group flex flex-col rounded-xl border border-line bg-surface p-5 text-left no-underline shadow-card transition-colors hover:border-line-2 hover:bg-canvas"
            >
              <div className="flex items-center gap-3">
                <ProjectAvatar name={project.name} className="h-8 w-8" />
                <h2 className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{project.name}</h2>
              </div>
              <p className="mt-3 line-clamp-2 min-h-[42px] text-[14px] leading-[1.5] text-ink-2">
                {project.description || "No description yet."}
              </p>
              <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-2">
                <span className={`h-2 w-2 rounded-full ${project.knowledge ? "bg-ok" : "bg-line-2"}`} />
                {project.knowledge ? "Project notes added" : "No project notes yet"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-[calc(100dvh-6.25rem)] w-full max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      {children}
    </main>
  );
}
