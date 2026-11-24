import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileImage, RotateCw, X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import {
  getGetProjectAnalysisRunQueryKey,
  getListProjectAnalysisRunsQueryKey,
  getListProjectFindingsQueryKey,
  useCreateProjectFinding,
  useGetProjectAnalysisRun,
  useListProjectAnalysisRuns,
  useListProjectFindings,
  type ProjectFinding,
  type ProjectFindingType,
} from "@workspace/api-client-react";
import { AnalysisResults } from "@/components/analysis-results";
import { DeleteAnalysisDialog } from "@/components/delete-analysis-dialog";
import { FindingRow } from "@/components/project-finding-row";
import { FindingMark } from "@/components/marks";

const modes: Record<string, string> = { summarize: "Summary", extract_data_points: "Data points", identify_ui_elements: "UI elements", describe_code: "Code context", system_design: "Systems context" };
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Not reviewed yet";

export function ProjectMemory({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const history = useListProjectAnalysisRuns(projectId, { query: { queryKey: getListProjectAnalysisRunsQueryKey(projectId), enabled: projectId > 0 } });
  const findingsQuery = useListProjectFindings(projectId, { query: { queryKey: getListProjectFindingsQueryKey(projectId), enabled: projectId > 0 } });
  const [activeRun, setActiveRun] = useState<number | null>(null);
  const detail = useGetProjectAnalysisRun(projectId, activeRun ?? 0, { query: { queryKey: getGetProjectAnalysisRunQueryKey(projectId, activeRun ?? 0), enabled: !!activeRun } });
  const createFinding = useCreateProjectFinding();
  const [statement, setStatement] = useState("");
  const [type, setType] = useState<ProjectFindingType>("fact");
  const [status, setStatus] = useState<"confirmed" | "open_conflict">("confirmed");
  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: getListProjectFindingsQueryKey(projectId) }),
    queryClient.invalidateQueries({ queryKey: getListProjectAnalysisRunsQueryKey(projectId) }),
    ...(activeRun ? [queryClient.invalidateQueries({ queryKey: getGetProjectAnalysisRunQueryKey(projectId, activeRun) })] : []),
  ]);
  const runs = [...(history.data?.runs ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const onRunDeleted = (runId: number) => {
    setActiveRun((current) => current === runId ? null : current);
    queryClient.removeQueries({ queryKey: getGetProjectAnalysisRunQueryKey(projectId, runId), exact: true });
    void invalidate();
  };
  const findings = findingsQuery.data?.findings ?? [];
  const grouped: [string, ProjectFinding[]][] = [
    ["Confirmed facts", findings.filter((finding) => finding.status === "confirmed" && finding.type !== "open_question")],
    ["Open conflicts", findings.filter((finding) => finding.status === "open_conflict" && finding.type !== "open_question")],
    ["Open questions", findings.filter((finding) => finding.type === "open_question" && ["confirmed", "open_conflict"].includes(finding.status))],
    ["Pending review", findings.filter((finding) => finding.status === "pending")],
    ["Other findings", findings.filter((finding) => ["dismissed", "retired"].includes(finding.status))],
  ];
  const addFinding = (event: FormEvent) => {
    event.preventDefault();
    if (!statement.trim()) return;
    createFinding.mutate({ id: projectId, data: { statement: statement.trim(), type, status } }, { onSuccess: () => { setStatement(""); void invalidate(); } });
  };
  const groupMark: Record<string, ProjectFindingType> = { "Confirmed facts": "fact", "Open conflicts": "conflict", "Open questions": "open_question", "Pending review": "fact", "Other findings": "fact" };
  return <div className="space-y-10" data-testid="section-project-memory">
    <section aria-labelledby="findings-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="findings-h" className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Project memory</h2>
          <p className="mt-0.5 text-[14px] text-ink-2">Reviewed findings for this client. Confirmed facts and open conflicts are given to every later analysis.</p>
        </div>
      </div>
      {findingsQuery.isPending ? <div className="h-40 animate-pulse rounded-xl bg-subtle"/> : findingsQuery.isError ? <QueryError onRetry={() => void findingsQuery.refetch()} message="Project findings couldn’t be loaded."/> : <div className="space-y-4">{grouped.filter(([label, entries]) => entries.length > 0 || label !== "Other findings").map(([label, entries]) => (
        <section key={label} className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          <header className="flex h-11 items-center gap-2 border-b border-line px-4">
            {label !== "Pending review" && label !== "Other findings" ? <FindingMark type={groupMark[label]} size="sm" /> : null}
            <h3 className="text-[14px] font-semibold text-ink">{label}</h3>
            <span className="font-mono text-[12px] text-ink-3">{entries.length}</span>
          </header>
          {entries.length ? <div className="divide-y divide-line">{entries.map((finding) => (
            <FindingRow key={finding.id} finding={finding} onUpdated={() => void invalidate()} onOpenRun={setActiveRun}/>
          ))}</div> : <p className="px-4 py-4 text-[13px] text-ink-2">{label === "Pending review" ? "Nothing waiting. New findings appear here after each analysis." : "None yet."}</p>}
        </section>
      ))}</div>}
      <form onSubmit={addFinding} className="mt-4 rounded-xl border border-line bg-surface shadow-card">
        <header className="flex h-11 items-center border-b border-line px-4"><h3 className="text-[14px] font-semibold text-ink">Add a finding by hand</h3></header>
        <div className="p-4">
          <label className="block text-[13px] font-medium text-ink-2">Statement
            <textarea data-testid="input-manual-finding" value={statement} onChange={(event) => setStatement(event.target.value)} maxLength={2000} required rows={2}
              placeholder="Something you learned from the client, a conflict between sources, or a question to ask" className="mt-1.5 w-full resize-y rounded-md border border-line-2 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-ink-3"/>
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-[13px] font-medium text-ink-2">Kind
              <select data-testid="select-finding-type" value={type} onChange={(event) => setType(event.target.value as ProjectFindingType)} className="mt-1 block h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-[14px] text-ink">
                <option value="fact">Fact</option><option value="conflict">Conflict</option><option value="open_question">Open question</option>
              </select>
            </label>
            <label className="text-[13px] font-medium text-ink-2">Status
              <select data-testid="select-finding-status" value={status} onChange={(event) => setStatus(event.target.value as "confirmed" | "open_conflict")} className="mt-1 block h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-[14px] text-ink">
                <option value="confirmed">{type === "open_question" ? "Keep as open question" : "Confirmed"}</option><option value="open_conflict">Open conflict</option>
              </select>
            </label>
            <button data-testid="button-add-finding" disabled={!statement.trim() || createFinding.isPending} className="h-9 self-end rounded-md bg-ink px-4 text-[14px] font-medium text-surface hover:opacity-85 disabled:opacity-50">{createFinding.isPending ? "Adding…" : "Add finding"}</button>
          </div>
          {createFinding.isError && <p role="alert" className="mt-2 text-[13px] text-conflict">{createFinding.error.message}</p>}
        </div>
      </form>
    </section>

    <section aria-labelledby="runs-h">
      <h2 id="runs-h" className="text-[20px] font-semibold tracking-[-0.025em] text-ink">Analysis runs</h2>
      <p className="mb-4 mt-0.5 text-[14px] text-ink-2">Every analysis in this project, saved with the memory it used.</p>
      {history.isPending ? <div className="h-32 animate-pulse rounded-xl bg-subtle"/> : history.isError ? <QueryError onRetry={() => void history.refetch()} message="Analysis runs couldn’t be loaded."/> : runs.length === 0 ? <Empty icon={<FileImage className="h-5 w-5"/>} title="No analyses yet" text="Run an analysis with this project selected and it will be saved here."/> : <ul className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">{runs.map((run) => (
        <li key={run.id} className={`relative border-b border-line last:border-0 ${activeRun === run.id ? "bg-subtle" : ""}`}>
          <button data-testid={`button-open-run-${run.id}`} type="button" onClick={() => setActiveRun(run.id)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-4 py-3 pr-28 text-left transition-colors hover:bg-canvas">
            <span className="flex min-w-0 items-center gap-2"><span className="font-mono text-[12px] text-ink-3">#{run.id}</span><span className="text-[14px] font-medium text-ink">{modes[run.mode] ?? run.mode}</span></span>
            <span className="text-[13px] text-ink-2 tabular">{dateLabel(run.createdAt)}</span>
            <span className="col-span-2 line-clamp-1 text-[13px] text-ink-2">{run.summary?.split("\n")[0] || "Saved analysis"}</span>
            <span className="col-span-2 mt-1 flex flex-wrap gap-1.5">{run.imageNames.map((name, index) => <span key={`${name}-${index}`} className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-line-2 px-2 text-[12px] text-ink-2"><span className="font-mono text-ink">IMG-{index + 1}</span>{name}</span>)}</span>
          </button>
          <div className="absolute right-3 top-2.5">
            <DeleteAnalysisDialog projectId={projectId} runId={run.id}
              label={`${modes[run.mode] ?? run.mode} · ${dateLabel(run.createdAt)}`}
              onDeleted={() => onRunDeleted(run.id)} />
          </div>
        </li>
      ))}</ul>}
      {activeRun !== null && <div className="mt-4 rounded-xl border border-line-2 bg-canvas p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h3 className="text-[15px] font-semibold text-ink">Analysis #{activeRun}</h3><p className="text-[13px] text-ink-2">{detail.data ? `${modes[detail.data.mode] ?? detail.data.mode} · ${dateLabel(detail.data.createdAt)} · read only` : "Loading…"}</p></div>
          <button type="button" data-testid="button-close-run" onClick={() => setActiveRun(null)} aria-label="Close analysis" className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-subtle hover:text-ink"><X className="h-4 w-4"/></button>
        </div>
        {detail.isPending ? <div className="h-40 animate-pulse rounded-xl bg-subtle"/> : detail.isError ? <QueryError message="This saved result couldn’t be loaded." onRetry={() => void detail.refetch()}/> : detail.data && <AnalysisResults data={detail.data.result} mode={detail.data.mode} readOnly/>}
      </div>}
    </section>
  </div>;
}

function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-dashed border-line-2 px-5 py-10 text-center"><span className="mx-auto grid h-10 w-10 place-items-center rounded-full border border-line-2 text-ink-2">{icon}</span><p className="mt-3 text-[14px] font-medium text-ink">{title}</p><p className="mt-1 text-[13px] text-ink-2">{text}</p></div>; }
function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-conflict/30 bg-conflict-bg px-4 py-3 text-[14px] text-ink"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0 text-conflict"/>{message}</span><button type="button" onClick={onRetry} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line-2 bg-surface px-2.5 text-[13px] font-medium hover:bg-subtle"><RotateCw className="h-3.5 w-3.5"/>Retry</button></div>; }
