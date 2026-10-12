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
    return <PageFrame><div className="space-y-4"><div className="h-8 w-56 animate-pulse rounded-lg bg-[#e8f1f3]" /><div className="h-28 animate-pulse rounded-2xl border border-[#e4edef] bg-white/70" /></div></PageFrame>;
  }

  if (!isSignedIn) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-xl rounded-[22px] border border-[#dfeaec] bg-white/85 p-8 text-center shadow-[0_16px_44px_rgba(40,74,91,.06)] sm:p-10">
          <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf5f8] text-[#347f9d]"><FolderKanban className="h-5 w-5" /></span>
          <h2 className="font-display text-2xl font-semibold tracking-[-.04em] text-[#263f4d]">Your client projects</h2>
          <p className="mt-2 text-[14px] leading-6 text-[#71838d]">
            Sign in to keep each client’s project notes and analysis context separate.
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white no-underline transition hover:bg-[#286d88]"
          >
            Sign in to continue
          </Link>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#568da0]">
            <FolderKanban className="h-4 w-4" />
            Workspace
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-[-.05em] text-[#243d4b]">Client projects</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#71838d]">
            Keep each client’s knowledge and analysis context in its own project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((visible) => !visible)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(52,127,157,.17)] transition hover:bg-[#286d88]"
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
          className="mb-7 grid gap-4 rounded-[20px] border border-[#dcebef] bg-white/85 p-5 shadow-[0_10px_30px_rgba(39,75,95,.04)] sm:grid-cols-2 sm:p-6"
        >
          <label className="text-sm font-medium text-slate-700">
            Project name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Acme systems review"
              className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none transition focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Short description <span className="font-normal text-slate-400">(optional)</span>
            <input
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Project goals or scope"
              className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none transition focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-lg bg-[#294957] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f3c49] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Create project"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-[#71838d] transition hover:bg-[#f3f8f9]"
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
        <div className="rounded-[22px] border border-dashed border-[#cbdfe4] bg-white/70 px-6 py-12 text-center">
          <Sparkles className="mx-auto mb-4 h-6 w-6 text-[#6b9dad]" />
          <h3 className="font-display text-lg font-semibold text-[#2b4654]">Start with a client project</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[#71838d]">
            Add project-specific notes once, then select the project from the top bar when analyzing client system images.
          </p>
          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-5 rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#286d88]"
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
              className="group rounded-[20px] border border-[#dfeaec] bg-white/85 p-5 text-left no-underline shadow-[0_7px_24px_rgba(39,75,95,.035)] transition hover:-translate-y-0.5 hover:border-[#bdd9e0] hover:shadow-[0_16px_32px_rgba(39,75,95,.075)] sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[17px] font-semibold tracking-[-.025em] text-[#2b4654]">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-[13px] leading-5 text-[#7a8b93]">
                    {project.description || "No project description yet."}
                  </p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9aabb1] transition group-hover:translate-x-1 group-hover:text-[#347f9d]" />
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-[#edf1f2] pt-4 text-xs font-medium text-[#87979e]">
                <span className={`h-1.5 w-1.5 rounded-full ${project.knowledge ? "bg-[#66a999]" : "bg-[#cbd7da]"}`} />
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
    <main className="mx-auto min-h-[calc(100dvh-4.4rem)] max-w-[1150px] px-4 py-10 sm:px-8 md:py-14">
      {children}
    </main>
  );
}
