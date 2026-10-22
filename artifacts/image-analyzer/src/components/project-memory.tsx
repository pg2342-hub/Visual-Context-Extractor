import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, AlertCircle, BookOpen, Clock3, FileImage, Plus, RotateCw } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import {
  getGetProjectAnalysisRunQueryKey,
  getListProjectAnalysisRunsQueryKey,
  getListProjectFindingsQueryKey,
  useCreateProjectFinding,
  useGetProjectAnalysisRun,
  useListProjectAnalysisRuns,
  useListProjectFindings,
  useUpdateProjectFinding,
  type ProjectFinding,
  type ProjectFindingType,
} from "@workspace/api-client-react";
import { AnalysisResults } from "@/components/analysis-results";
import { DeleteAnalysisDialog } from "@/components/delete-analysis-dialog";

const modes: Record<string, string> = { summarize: "Summary", extract_data_points: "Data points", identify_ui_elements: "UI elements", describe_code: "Code context", system_design: "Systems context" };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not reviewed yet";

export function ProjectMemory({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const history = useListProjectAnalysisRuns(projectId, { query: { queryKey: getListProjectAnalysisRunsQueryKey(projectId), enabled: projectId > 0 } });
  const findingsQuery = useListProjectFindings(projectId, { query: { queryKey: getListProjectFindingsQueryKey(projectId), enabled: projectId > 0 } });
  const [activeRun, setActiveRun] = useState<number | null>(null);
  const detail = useGetProjectAnalysisRun(projectId, activeRun ?? 0, { query: { queryKey: getGetProjectAnalysisRunQueryKey(projectId, activeRun ?? 0), enabled: !!activeRun } });
  const updateFinding = useUpdateProjectFinding();
  const createFinding = useCreateProjectFinding();
  const [statement, setStatement] = useState("");
  const [type, setType] = useState<ProjectFindingType>("fact");
  const [status, setStatus] = useState<"confirmed" | "open_conflict">("confirmed");
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListProjectFindingsQueryKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: getListProjectAnalysisRunsQueryKey(projectId) }),
  ]);
  const runs = [...(history.data?.runs ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const onRunDeleted = (runId: number) => {
    setActiveRun((current) => current === runId ? null : current);
    queryClient.removeQueries({ queryKey: getGetProjectAnalysisRunQueryKey(projectId, runId), exact: true });
    void invalidate();
  };
  const findings = findingsQuery.data?.findings ?? [];
  const grouped: [string, ProjectFinding[]][] = [
    ["Confirmed facts", findings.filter((finding) => finding.status === "confirmed")],
    ["Open conflicts", findings.filter((finding) => finding.status === "open_conflict")],
    ["Pending review", findings.filter((finding) => finding.status === "pending")],
    ["Other findings", findings.filter((finding) => ["dismissed", "retired"].includes(finding.status))],
  ];
  const changeStatus = (finding: ProjectFinding, next: "confirmed" | "open_conflict" | "dismissed" | "retired") => {
    updateFinding.mutate({ id: projectId, findingId: finding.id, data: { status: next } }, { onSuccess: () => void invalidate() });
  };
  const addFinding = (event: FormEvent) => {
    event.preventDefault();
    if (!statement.trim()) return;
    createFinding.mutate({ id: projectId, data: { statement: statement.trim(), type, status } }, { onSuccess: () => { setStatement(""); void invalidate(); } });
  };
  return <div className="space-y-9" data-testid="section-project-memory">
    <section>
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-[#eaf5f7] p-2 text-[#347f9d]"><Activity className="h-4 w-4" /></span><div><h3 className="font-display text-xl font-semibold text-[#2b4654]">Analysis history</h3><p className="text-sm text-[#82929a]">Saved runs and the context each one produced.</p></div></div>
      {history.isPending ? <div className="space-y-2"><div className="h-16 animate-pulse rounded-xl bg-[#eff5f6]"/><div className="h-16 animate-pulse rounded-xl bg-[#eff5f6]"/></div> : history.isError ? <QueryError onRetry={() => void history.refetch()} message="Analysis history couldn’t be loaded."/> : runs.length === 0 ? <Empty icon={<FileImage className="h-5 w-5"/>} title="No saved analyses yet" text="Project analyses will appear here with their images and summaries."/> : <div className="space-y-2">{runs.map((run) => (
        <div key={run.id} className="relative">
          <button data-testid={`button-open-run-${run.id}`} type="button" onClick={() => setActiveRun(run.id)} className={`w-full rounded-xl border p-4 pr-24 text-left transition hover:border-[#a9cbd4] hover:bg-[#f7fbfc] ${activeRun === run.id ? "border-[#80b6c5] bg-[#f2f9fa]" : "border-[#e4edef] bg-white/70"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-[#304b58]">{modes[run.mode] ?? run.mode}</span><span className="inline-flex items-center gap-1 text-xs text-[#81929a]"><Clock3 className="h-3.5 w-3.5"/>{dateLabel(run.createdAt)}</span></div>
            <p className="mt-1 line-clamp-1 text-sm text-[#607681]">{run.summary?.split("\n")[0] || "Saved analysis"}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{run.imageNames.map((name, index) => <span key={`${name}-${index}`} className="rounded-md bg-[#eff5f6] px-2 py-1 text-[11px] text-[#627d87]">{name}</span>)}</div>
          </button>
          <div className="absolute bottom-3 right-3">
            <DeleteAnalysisDialog projectId={projectId} runId={run.id}
              label={`${modes[run.mode] ?? run.mode} · ${dateLabel(run.createdAt)}`}
              onDeleted={() => onRunDeleted(run.id)} />
          </div>
        </div>
      ))}</div>}
      {activeRun !== null && <div className="mt-4 rounded-2xl border border-[#dfeaec] bg-[#f8fbfc] p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#70909b]">Saved result · read only</p><p className="mt-1 text-xs text-[#82929a]">{detail.data ? `${modes[detail.data.mode] ?? detail.data.mode} · ${dateLabel(detail.data.createdAt)}` : ""}</p></div><button type="button" data-testid="button-close-run" onClick={() => setActiveRun(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#58737e] hover:bg-[#eaf3f5]">Close</button></div>{detail.isPending ? <div className="h-40 animate-pulse rounded-xl bg-[#edf4f5]"/> : detail.isError ? <QueryError message="This saved result couldn’t be loaded." onRetry={() => void detail.refetch()}/> : detail.data && <AnalysisResults data={detail.data.result} mode={detail.data.mode} readOnly/>}</div>}
    </section>
    <section className="border-t border-[#e8eff1] pt-7">
      <div className="mb-4 flex items-center gap-3"><span className="rounded-xl bg-[#eff5ec] p-2 text-[#668368]"><BookOpen className="h-4 w-4" /></span><div><h3 className="font-display text-xl font-semibold text-[#2b4654]">Reviewed findings</h3><p className="text-sm text-[#82929a]">Knowledge is scoped to this project and can be revised at any time.</p></div></div>
      {findingsQuery.isPending ? <div className="h-32 animate-pulse rounded-xl bg-[#eff5f6]"/> : findingsQuery.isError ? <QueryError onRetry={() => void findingsQuery.refetch()} message="Project findings couldn’t be loaded."/> : <div className="space-y-5">{grouped.map(([label, entries]) => <div key={label}><h4 className="mb-2 text-xs font-semibold uppercase tracking-[.13em] text-[#718891]">{label} <span className="text-[#9aaab0]">{entries.length}</span></h4>{entries.length ? <div className="space-y-2">{entries.map((finding) => <FindingRow key={finding.id} finding={finding} onStatus={changeStatus} busy={updateFinding.isPending}/>)}</div> : <p className="rounded-xl border border-dashed border-[#dce8eb] px-4 py-3 text-sm text-[#8899a0]">Nothing here yet.</p>}</div>)}</div>}
      <form onSubmit={addFinding} className="mt-6 rounded-xl border border-[#dfeaec] bg-[#f8fbfc] p-4"><h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#385563]"><Plus className="h-4 w-4"/>Add a reviewed finding</h4><label className="block text-xs font-medium text-[#607681]">Statement<textarea data-testid="input-manual-finding" value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={2000} required rows={2} placeholder="A client-specific fact or unresolved conflict…" className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-white px-3 py-2 text-sm outline-none focus:border-[#78afc0]"/></label><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><label className="text-xs font-medium text-[#607681]">Finding type<select data-testid="select-finding-type" value={type} onChange={(event) => setType(event.target.value as ProjectFindingType)} className="mt-1 block h-10 w-full rounded-lg border border-[#dce8eb] bg-white px-2 text-sm"><option value="fact">Fact</option><option value="conflict">Conflict</option><option value="open_question">Open question</option></select></label><label className="text-xs font-medium text-[#607681]">Initial status<select data-testid="select-finding-status" value={status} onChange={(event) => setStatus(event.target.value as "confirmed" | "open_conflict")} className="mt-1 block h-10 w-full rounded-lg border border-[#dce8eb] bg-white px-2 text-sm"><option value="confirmed">Confirmed</option><option value="open_conflict">Open conflict</option></select></label><button data-testid="button-add-finding" disabled={!statement.trim() || createFinding.isPending} className="self-end rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#286d88] disabled:opacity-50">{createFinding.isPending ? "Adding…" : "Add finding"}</button></div>{createFinding.isError && <p role="alert" className="mt-2 text-sm text-red-700">{createFinding.error.message}</p>}</form>
    </section>
  </div>;
}

function FindingRow({ finding, onStatus, busy }: { finding: ProjectFinding; onStatus: (finding: ProjectFinding, status: "confirmed" | "open_conflict" | "dismissed" | "retired") => void; busy: boolean }) {
  const runText = finding.analysisRunId ? `Analysis #${finding.analysisRunId}` : finding.sourceKind === "manual" ? "Manual finding" : "Deleted analysis";
  return <article data-testid={`finding-${finding.id}`} className="rounded-xl border border-[#e4edef] bg-white/80 p-4"><p className="text-sm leading-6 text-[#405b68]">{finding.statement}</p><p className="mt-2 text-[11px] text-[#81939a]">{runText} · {finding.reviewedBy ? "Reviewed by You" : "Awaiting review"} · {dateLabel(finding.reviewedAt)}</p>{finding.sourceLabels?.length > 0 && <p className="mt-1 text-[11px] text-[#93a1a7]">Sources: {finding.sourceLabels.join(", ")}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#f0f5f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b858e]">{finding.type.replace("_", " ")} · {finding.status.replace("_", " ")}</span>{finding.status !== "confirmed" && <button type="button" disabled={busy} onClick={() => onStatus(finding,"confirmed")} className="rounded-md px-2 py-1 text-xs font-medium text-[#3d7965] hover:bg-[#edf6f0]">Confirm</button>}{finding.status !== "open_conflict" && <button type="button" disabled={busy} onClick={() => onStatus(finding,"open_conflict")} className="rounded-md px-2 py-1 text-xs font-medium text-[#9a7140] hover:bg-[#fbf4e9]">Open conflict</button>}{finding.status !== "retired" && <button type="button" disabled={busy} onClick={() => onStatus(finding,"retired")} className="rounded-md px-2 py-1 text-xs font-medium text-[#71838d] hover:bg-[#f1f5f6]">Retire</button>}{finding.status !== "dismissed" && <button type="button" disabled={busy} onClick={() => onStatus(finding,"dismissed")} className="rounded-md px-2 py-1 text-xs font-medium text-[#a25a55] hover:bg-[#fff3f1]">Dismiss</button>}</div></article>;
}
function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-dashed border-[#dce8eb] bg-[#f9fcfc] px-5 py-8 text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf4f6] text-[#6d98a5]">{icon}</span><p className="mt-3 text-sm font-semibold text-[#49636f]">{title}</p><p className="mt-1 text-xs text-[#89999f]">{text}</p></div>; }
function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-[#efd8d5] bg-[#fff8f7] p-4 text-sm text-[#94524c]"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0"/>{message}</span><button type="button" onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold hover:bg-[#f9e9e6]"><RotateCw className="h-3.5 w-3.5"/>Retry</button></div>; }
