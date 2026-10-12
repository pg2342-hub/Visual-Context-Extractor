import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import { useUser } from "@clerk/react";
import { ArrowLeft, BookOpenText, Cable, Check, CircleHelp, FolderKanban, LoaderCircle, Save, Settings2 } from "lucide-react";
import { useProjects } from "@/components/project-context";
import type { ClientProject } from "@workspace/api-client-react";

type SettingsSection = "details" | "knowledge" | "integrations";

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
  const [section, setSection] = useState<SettingsSection>("details");
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
    return <SettingsFrame><p className="text-sm text-slate-500">Loading project settings…</p></SettingsFrame>;
  }
  if (!isSignedIn) {
    return (
      <SettingsFrame>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Sign in to manage this project</h2>
          <Link href="/sign-in" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      </SettingsFrame>
    );
  }
  if (error) {
    return <SettingsFrame><p role="alert" className="text-sm text-red-700">{error.message}</p></SettingsFrame>;
  }
  if (!project || !Number.isInteger(projectId)) {
    return (
      <SettingsFrame>
        <p className="text-slate-600">This project isn’t available in your workspace.</p>
        <Link href="/projects" className="mt-4 inline-flex text-sm font-semibold text-blue-700">Back to client projects</Link>
      </SettingsFrame>
    );
  }

  const sections: { id: SettingsSection; label: string; icon: typeof Settings2 }[] = [
    { id: "details", label: "Project details", icon: Settings2 },
    { id: "knowledge", label: "Knowledge", icon: BookOpenText },
    { id: "integrations", label: "Integrations", icon: Cable },
  ];

  return (
    <SettingsFrame>
      <Link href="/projects" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 no-underline hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        All client projects
      </Link>

      <div className="mb-7">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-blue-700">
          <FolderKanban className="h-4 w-4" />
          Client project
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">{project.name}</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Project settings stay with this client and are used when this project is selected in the top bar.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <nav aria-label="Project settings" className="flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 lg:flex-col">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                section === id ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {section === "details" && (
            <div className="max-w-2xl">
              <h3 className="text-xl font-semibold text-slate-900">Project details</h3>
              <p className="mt-1 text-sm text-slate-500">Identify this client project and its scope.</p>
              <div className="mt-6 grid gap-5">
                <label className="text-sm font-medium text-slate-700">
                  Project name
                  <input
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    value={description}
                    maxLength={2000}
                    rows={4}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Client goals, scope, or background"
                    className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              </div>
            </div>
          )}

          {section === "knowledge" && (
            <div className="max-w-3xl">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <BookOpenText className="h-5 w-5 text-blue-700" />
                Project knowledge
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Add client-specific facts the analyzer should use as background when this project is selected.
              </p>
              <label className="mt-6 block text-sm font-medium text-slate-700">
                Notes for analysis
                <textarea
                  value={knowledge}
                  maxLength={30000}
                  rows={14}
                  onChange={(event) => setKnowledge(event.target.value)}
                  placeholder={"Examples:\n• Business goals and terminology\n• Known systems and their roles\n• Constraints or confirmed assumptions\n• Questions the client has already answered"}
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 font-mono text-sm leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <span className="mt-1 block text-right text-xs font-normal text-slate-400">
                  {knowledge.length.toLocaleString()} / 30,000 characters
                </span>
              </label>
              <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                When this client project is active, these notes are included as reference context in image analysis. The analyzer is instructed to distinguish notes from what is actually visible in the image.
              </p>
            </div>
          )}

          {section === "integrations" && (
            <div className="max-w-2xl">
              <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <Cable className="h-5 w-5 text-blue-700" />
                Project integrations
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Connections and their permissions will be configured separately for each client project.
              </p>
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <div className="flex items-start gap-3">
                  <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                  <div>
                    <h4 className="font-semibold text-slate-800">Connections are paused for now</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      No client databases or external accounts are connected. When enabled, you’ll manage source connections from this project, with schema and metadata access only.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={() => void removeProject()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete project
            </button>
            <div className="flex items-center gap-3">
              {saveMutation.isError && (
                <span role="alert" className="max-w-xs text-sm text-red-700">
                  {saveMutation.error.message}
                </span>
              )}
              {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check className="h-4 w-4" />Saved</span>}
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={!isDirty || saveMutation.isPending || !name.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saveMutation.isPending ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </SettingsFrame>
  );
}

function SettingsFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-7xl px-4 py-8 sm:px-6 md:py-10">
      {children}
    </main>
  );
}
