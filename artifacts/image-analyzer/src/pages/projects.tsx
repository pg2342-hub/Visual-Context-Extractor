import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowRight, FolderKanban, Plus, Sparkles } from "lucide-react";
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
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async (project) => {
      await refreshProjects();
      selectProject(project.id);
      setLocation(`/projects/${project.id}/settings`);
    },
  });

  if (!isLoaded) {
    return <PageFrame><p className="text-sm text-slate-500">Loading your workspace…</p></PageFrame>;
  }

  if (!isSignedIn) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <FolderKanban className="mx-auto mb-4 h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold">Your client projects</h2>
          <p className="mt-2 text-slate-600">
            Sign in to keep each client’s project notes and analysis context separate.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Sign in to continue
          </Link>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
            <FolderKanban className="h-4 w-4" />
            Workspace
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Client projects</h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Keep each client’s knowledge and analysis context in its own project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((visible) => !visible)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
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
          className="mb-6 grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 sm:grid-cols-2"
        >
          <label className="text-sm font-medium text-slate-700">
            Project name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme systems review"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Short description <span className="font-normal text-slate-400">(optional)</span>
            <input
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Project goals or scope"
              className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Create project"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-white"
            >
              Cancel
            </button>
            {createMutation.isError && (
              <span role="alert" className="text-sm text-red-700">
                {createMutation.error.message}
              </span>
            )}
          </div>
        </form>
      )}

      {error && <p role="alert" className="mb-4 text-sm text-red-700">{error.message}</p>}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto mb-3 h-7 w-7 text-blue-600" />
          <h3 className="text-lg font-semibold text-slate-900">Start with a client project</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Add project-specific notes once, then select the project from the top bar when analyzing client system images.
          </p>
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}/settings`}
              onClick={() => selectProject(project.id)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-slate-900">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">
                    {project.description || "No project description yet."}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" />
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                <span className={`h-2 w-2 rounded-full ${project.knowledge ? "bg-emerald-500" : "bg-slate-300"}`} />
                {project.knowledge ? "Knowledge added" : "Knowledge not set up"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      {children}
    </main>
  );
}
