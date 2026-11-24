import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRoute, useSearch } from "wouter";
import { useUser } from "@clerk/react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/marks";
import { ProjectAvatar } from "@/components/app-header";
import { useProjects } from "@/components/project-context";
import { ProjectDocuments } from "@/components/project-documents";
import { ProjectConnections } from "@/components/project-connections";
import { ProjectMemory } from "@/components/project-memory";
import type { ClientProject } from "@workspace/api-client-react";

type SettingsSection = "details" | "knowledge" | "integrations" | "memory";

async function updateProject(
  projectId: number,
  updates: Partial<Pick<ClientProject, "name" | "description" | "knowledge">>,
) {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; details?: string };
    throw new Error(body.details || body.error || "Could not save project settings.");
  }
  return response.json() as Promise<ClientProject>;
}

export default function ProjectSettingsPage() {
  const [, params] = useRoute("/projects/:id/settings");
  const projectId = Number(params?.id);
  const { isLoaded, isSignedIn } = useUser();
  const { projects, isLoading, error, selectedProject, selectProject, refreshProjects } = useProjects();
  const queryProject = projects.find((project) => project.id === projectId);
  const project =
    queryProject ??
    (selectedProject?.id === projectId ? selectedProject : null);
  const [, setLocation] = useLocation();
  const search = useSearch();
  const requested = new URLSearchParams(search).get("tab");
  const section: SettingsSection = requested === "knowledge" || requested === "integrations" || requested === "memory" ? requested : "details";
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [knowledge, setKnowledge] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description);
    setKnowledge(project.knowledge);
    selectProject(project.id);
  }, [project?.id, project?.name, project?.description, project?.knowledge, selectProject]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProject(projectId, {
        name: name.trim(),
        description: description.trim(),
        knowledge,
      }),
    onSuccess: async () => {
      setSaved(true);
      await refreshProjects();
      window.setTimeout(() => setSaved(false), 2500);
    },
  });

  const isDirty = useMemo(
    () =>
      Boolean(project) &&
      (name !== project?.name ||
        description !== project?.description ||
        knowledge !== project?.knowledge),
    [description, knowledge, name, project],
  );

  const removeProject = async () => {
    if (!project) return;
    const confirmed = window.confirm(
      `Delete “${project.name}”? This permanently removes its project details and knowledge, including unsaved changes. This cannot be undone.`,
    );
    if (!confirmed) return;

    const response = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      window.alert("The project could not be deleted. Please try again.");
      return;
    }
    selectProject(null);
    await refreshProjects();
    setLocation("/projects");
  };

  if (!isLoaded || (isSignedIn && isLoading)) {
    return <SettingsFrame><div className="space-y-4"><div className="h-8 w-60 animate-pulse rounded-md bg-subtle" /><div className="h-64 animate-pulse rounded-xl bg-subtle" /></div></SettingsFrame>;
  }
  if (!isSignedIn) {
    return (
      <SettingsFrame>
        <div className="mx-auto max-w-md rounded-xl border border-line bg-surface p-8 text-center shadow-card">
          <h1 className="text-[18px] font-semibold text-ink">Sign in to open this project</h1>
          <p className="mt-1 text-[14px] text-ink-2">Client projects are private to your account.</p>
          <Link href="/sign-in" className="mt-5 inline-flex h-9 items-center rounded-md bg-ink px-4 text-[14px] font-medium text-surface no-underline hover:opacity-85">Sign in</Link>
        </div>
      </SettingsFrame>
    );
  }
  if (error) {
    return <SettingsFrame><p role="alert" className="text-[14px] text-conflict">{error.message}</p></SettingsFrame>;
  }
  if (!project || !Number.isInteger(projectId)) {
    return (
      <SettingsFrame>
        <h1 className="text-[20px] font-semibold text-ink">Project not found</h1>
        <p className="mt-1 text-[14px] text-ink-2">It may have been deleted, or it belongs to another account.</p>
        <Link href="/projects" className="mt-4 inline-flex h-9 items-center rounded-md border border-line-2 px-3 text-[14px] font-medium text-ink no-underline hover:bg-subtle">All client projects</Link>
      </SettingsFrame>
    );
  }

  const showSave = section === "details" || section === "knowledge";
  const inputClass = "mt-1.5 w-full rounded-md border border-line-2 bg-surface px-3 text-[14px] text-ink outline-none transition-colors focus:border-ink-3 focus:ring-2 focus:ring-fact/20";

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-4 px-4 py-8 sm:px-6 lg:px-10">
          <ProjectAvatar name={project.name} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[28px] font-semibold leading-tight tracking-[-0.035em] text-ink">{project.name}</h1>
            <p className="mt-0.5 line-clamp-1 text-[14px] text-ink-2">{project.description || "No description yet. Add one in Settings."}</p>
          </div>
          <Link href="/" className="inline-flex h-9 items-center rounded-md bg-ink px-4 text-[14px] font-medium text-surface no-underline hover:opacity-85">New analysis</Link>
        </div>
      </div>

      <SettingsFrame>
        {section === "details" && (
          <div className="grid gap-6">
            <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="p-5 sm:p-6">
                <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Project details</h2>
                <p className="mt-0.5 text-[14px] text-ink-2">How this client appears in the project switcher.</p>
                <div className="mt-5 grid max-w-2xl gap-5">
                  <label className="text-[13px] font-medium text-ink-2">
                    Project name
                    <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} className={`${inputClass} h-10`} />
                  </label>
                  <label className="text-[13px] font-medium text-ink-2">
                    Description
                    <textarea value={description} maxLength={2000} rows={3} onChange={(event) => setDescription(event.target.value)} placeholder="Client goals, scope, or background" className={`${inputClass} resize-y py-2 leading-6`} />
                  </label>
                </div>
              </div>
              {renderSaveBar()}
            </section>

            <section className="overflow-hidden rounded-xl border border-conflict/30 bg-surface shadow-card">
              <div className="p-5 sm:p-6">
                <h2 className="text-[16px] font-semibold text-ink">Delete project</h2>
                <p className="mt-0.5 max-w-[68ch] text-[14px] text-ink-2">Permanently removes {project.name}, its knowledge, documents, connected systems, findings and analysis runs. This can’t be undone.</p>
              </div>
              <div className="flex justify-end border-t border-conflict/20 bg-conflict-bg px-5 py-3 sm:px-6">
                <button type="button" onClick={() => void removeProject()} className="inline-flex h-8 items-center rounded-md bg-conflict px-3 text-[13px] font-medium text-white hover:opacity-90 dark:text-black">
                  Delete project
                </button>
              </div>
            </section>
          </div>
        )}

        {section === "knowledge" && (
          <div className="grid gap-6">
            <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="p-5 sm:p-6">
                <h2 className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Project notes</h2>
                <p className="mt-0.5 max-w-[68ch] text-[14px] text-ink-2">
                  What you already know about this client. Notes are given to every analysis as background, and the model is told to keep them apart from what the images show.
                </p>
                <label className="mt-5 block text-[13px] font-medium text-ink-2">
                  <span className="sr-only">Notes for analysis</span>
                  <textarea
                    value={knowledge}
                    maxLength={30000}
                    rows={14}
                    onChange={(event) => setKnowledge(event.target.value)}
                    placeholder={"Business goals and terminology\nKnown systems and what each one does\nConstraints and confirmed assumptions\nQuestions the client has already answered"}
                    className={`${inputClass} resize-y bg-canvas py-3 font-mono text-[13px] leading-6`}
                  />
                  <span className="mt-1.5 block text-right font-mono text-[12px] font-normal text-ink-3">
                    {knowledge.length.toLocaleString()} / 30,000
                  </span>
                </label>
              </div>
              {renderSaveBar()}
            </section>
            <section className="rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <ProjectDocuments projectId={projectId} />
            </section>
          </div>
        )}

        {section === "integrations" && <ProjectConnections projectId={projectId} />}

        {section === "memory" && <ProjectMemory projectId={projectId} />}
      </SettingsFrame>
    </>
  );

  function renderSaveBar() {
    if (!showSave) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas px-5 py-3 sm:px-6">
        <p className="text-[13px] text-ink-2">
          {saveMutation.isError ? <span role="alert" className="text-conflict">{saveMutation.error.message}</span>
            : saved ? <span className="inline-flex items-center gap-1 text-ok"><Check className="h-3.5 w-3.5" />Saved</span>
            : isDirty ? "You have unsaved changes." : "All changes saved."}
        </p>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={!isDirty || saveMutation.isPending || !name.trim()}
          className="inline-flex h-8 items-center gap-2 rounded-md bg-ink px-3 text-[13px] font-medium text-surface transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saveMutation.isPending && <Spinner className="h-3.5 w-3.5" />}
          {saveMutation.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    );
  }
}

function SettingsFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
      {children}
    </main>
  );
}
