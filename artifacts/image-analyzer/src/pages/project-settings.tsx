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
    return <SettingsFrame><div className="space-y-4"><div className="h-8 w-60 animate-pulse rounded-lg bg-[#e8f1f3]" /><div className="h-64 animate-pulse rounded-[22px] border border-[#e4edef] bg-white/70" /></div></SettingsFrame>;
  }
  if (!isSignedIn) {
    return (
      <SettingsFrame>
        <div className="rounded-[22px] border border-[#dfeaec] bg-white/85 p-8 text-center shadow-[0_16px_44px_rgba(40,74,91,.06)]">
          <h2 className="font-display text-xl font-semibold tracking-[-.035em] text-[#263f4d]">Sign in to manage this project</h2>
          <Link href="/sign-in" className="mt-4 inline-flex rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white no-underline">
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
        <p className="text-[#71838d]">This project isn’t available in your workspace.</p>
        <Link href="/projects" className="mt-4 inline-flex text-sm font-semibold text-[#347f9d] no-underline">Back to client projects</Link>
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
      <Link href="/projects" className="mb-7 inline-flex items-center gap-2 text-[13px] font-medium text-[#71838d] no-underline hover:text-[#294957]">
        <ArrowLeft className="h-4 w-4" />
        All client projects
      </Link>

      <div className="mb-7">
        <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#568da0]">
          <FolderKanban className="h-4 w-4" />
          Client project
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-[-.05em] text-[#243d4b]">{project.name}</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#71838d]">
          Project settings stay with this client and are used when this project is selected in the top bar.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
        <nav aria-label="Project settings" className="flex gap-2 overflow-x-auto rounded-[17px] border border-[#dfeaec] bg-white/75 p-2 lg:flex-col">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={section === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                section === id ? "bg-[#eaf5f7] text-[#286b83]" : "text-[#71838d] hover:bg-[#f5f9fa]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <section className="min-w-0 rounded-[22px] border border-[#dfeaec] bg-white/85 p-5 shadow-[0_12px_34px_rgba(39,75,95,.045)] sm:p-8">
          {section === "details" && (
            <div className="max-w-2xl">
              <h3 className="font-display text-xl font-semibold tracking-[-.035em] text-[#2b4654]">Project details</h3>
              <p className="mt-1 text-[13px] text-[#82929a]">Identify this client project and its scope.</p>
              <div className="mt-6 grid gap-5">
                <label className="text-sm font-medium text-slate-700">
                  Project name
                  <input
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none transition focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
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
                    className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-white px-3 py-2.5 outline-none transition focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
                  />
                </label>
              </div>
            </div>
          )}

          {section === "knowledge" && (
            <div className="max-w-3xl">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-.035em] text-[#2b4654]">
                <BookOpenText className="h-5 w-5 text-blue-700" />
                Project knowledge
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-[#82929a]">
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
                  className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-[#fbfdfe] px-3 py-3 font-mono text-sm leading-6 outline-none transition focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
                />
                <span className="mt-1 block text-right text-xs font-normal text-slate-400">
                  {knowledge.length.toLocaleString()} / 30,000 characters
                </span>
              </label>
              <p className="mt-4 rounded-xl border border-[#dcebef] bg-[#f2f9fa] px-4 py-3 text-[13px] leading-6 text-[#4f6f7b]">
                When this client project is active, these notes are included as reference context in image analysis. The analyzer is instructed to distinguish notes from what is actually visible in the image.
              </p>
            </div>
          )}

          {section === "integrations" && (
            <div className="max-w-2xl">
              <h3 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-.035em] text-[#2b4654]">
                <Cable className="h-5 w-5 text-blue-700" />
                Project integrations
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-[#82929a]">
                Connections and their permissions will be configured separately for each client project.
              </p>
              <div className="mt-6 rounded-xl border border-dashed border-[#cbdfe4] bg-[#f8fbfc] p-5">
                <div className="flex items-start gap-3">
                  <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#7597a3]" />
                  <div>
                    <h4 className="font-semibold text-[#38515e]">Connections are paused for now</h4>
                    <p className="mt-1 text-[13px] leading-6 text-[#71838d]">
                      No client databases or external accounts are connected. When enabled, you’ll manage source connections from this project, with schema and metadata access only.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8eff1] pt-5">
            <button
              type="button"
              onClick={() => void removeProject()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#a44f49] transition hover:bg-[#fff4f2]"
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
                className="inline-flex items-center gap-2 rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#286d88] disabled:cursor-not-allowed disabled:opacity-50"
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
    <main className="mx-auto min-h-[calc(100dvh-4.4rem)] max-w-[1150px] px-4 py-10 sm:px-8 md:py-14">
      {children}
    </main>
  );
}
