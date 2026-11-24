import { useState } from "react";
import { useUpdateProjectFinding, type ProjectFinding, type ProjectFindingType } from "@workspace/api-client-react";
import { DeleteFindingDialog } from "@/components/delete-finding-dialog";
import { FindingMark, KIND_LABEL, SourceChip, sourceText } from "@/components/marks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type ReviewStatus = "confirmed" | "open_conflict" | "dismissed" | "retired";

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting review",
  confirmed: "Confirmed",
  open_conflict: "Open conflict",
  dismissed: "Dismissed",
  retired: "Retired",
};

export function FindingRow({ finding, onUpdated, onOpenRun }: {
  finding: ProjectFinding;
  onUpdated: () => void;
  onOpenRun: (id: number) => void;
}) {
  const mutation = useUpdateProjectFinding();
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState(finding.statement);
  const [type, setType] = useState<ProjectFindingType>(finding.type);
  const effectiveType = editing ? type : finding.type;
  const save = (status?: ReviewStatus) => {
    if (editing && !statement.trim()) return;
    mutation.mutate({
      id: finding.projectId, findingId: finding.id,
      data: {
        ...(editing ? { statement: statement.trim(), type } : {}),
        ...(status ? { status } : {}),
      },
    }, { onSuccess: () => { setEditing(false); onUpdated(); } });
  };
  const busy = mutation.isPending;
  const disabled = busy || (editing && !statement.trim());
  const reviewedDate = finding.reviewedAt
    ? new Date(finding.reviewedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;
  const statusLabel =
    finding.status === "confirmed" && finding.type === "open_question" ? "Kept open" : STATUS_LABEL[finding.status] ?? finding.status;
  const inactive = finding.status === "dismissed" || finding.status === "retired";

  return (
    <article data-testid={`finding-${finding.id}`} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3 px-4 py-3.5">
      <FindingMark type={effectiveType} muted={inactive} className="mt-0.5" />
      <div className="min-w-0">
        {editing ? (
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-ink-2">Statement
              <textarea autoFocus data-testid={`input-finding-statement-${finding.id}`}
                value={statement} onChange={(event) => setStatement(event.target.value)}
                maxLength={2000} rows={3} disabled={busy}
                className="mt-1.5 w-full resize-y rounded-md border border-line-2 bg-surface px-3 py-2 text-[14px] leading-6 text-ink outline-none focus:border-ink-3" />
            </label>
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">Kind
              <select data-testid={`select-finding-type-${finding.id}`} value={type}
                disabled={busy} onChange={(event) => setType(event.target.value as ProjectFindingType)}
                className="h-8 rounded-md border border-line-2 bg-surface px-2 text-[13px] text-ink">
                <option value="fact">Fact</option><option value="conflict">Conflict</option><option value="open_question">Open question</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" data-testid={`button-save-finding-${finding.id}`} disabled={disabled}
                onClick={() => save()} className="inline-flex h-8 items-center rounded-md bg-ink px-3 text-[13px] font-medium text-surface hover:opacity-85 disabled:opacity-50">
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" disabled={busy} onClick={() => { setEditing(false); mutation.reset(); }}
                className="inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium text-ink-2 hover:bg-subtle hover:text-ink">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className={cn("text-[14px] leading-6", inactive ? "text-ink-3" : "text-ink")}>{finding.statement}</p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={busy}
                  aria-label="Finding actions"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-2 outline-none transition-colors hover:bg-subtle hover:text-ink data-[state=open]:bg-subtle"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl border-line-2 bg-surface p-1.5 shadow-pop">
                  <DropdownMenuItem data-testid={`button-edit-finding-${finding.id}`} className="rounded-md px-2 py-2 text-[14px]"
                    onSelect={() => { setStatement(finding.statement); setType(finding.type); mutation.reset(); setEditing(true); }}>
                    Edit
                  </DropdownMenuItem>
                  {finding.status !== "confirmed" && (
                    <DropdownMenuItem className="rounded-md px-2 py-2 text-[14px]" onSelect={() => save("confirmed")}>
                      {effectiveType === "open_question" ? "Keep as open question" : "Confirm"}
                    </DropdownMenuItem>
                  )}
                  {finding.status !== "open_conflict" && (
                    <DropdownMenuItem className="rounded-md px-2 py-2 text-[14px]" onSelect={() => save("open_conflict")}>Mark as open conflict</DropdownMenuItem>
                  )}
                  {finding.status !== "retired" && (
                    <DropdownMenuItem className="rounded-md px-2 py-2 text-[14px]" onSelect={() => save("retired")}>Retire</DropdownMenuItem>
                  )}
                  {finding.status !== "dismissed" && (
                    <DropdownMenuItem className="rounded-md px-2 py-2 text-[14px]" onSelect={() => save("dismissed")}>Dismiss</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {finding.sourceRefs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {finding.sourceRefs.map((ref, i) => <SourceChip key={ref}>{sourceText(ref, finding.sourceLabels[i])}</SourceChip>)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-2">
              <span className="font-medium text-ink-2">{KIND_LABEL[finding.type]}</span>
              <span className="text-ink-3">·</span>
              <span className={cn(finding.status === "confirmed" && "text-ok", finding.status === "open_conflict" && "text-conflict")}>{statusLabel}</span>
              <span className="text-ink-3">·</span>
              {finding.analysisRunId
                ? <button type="button" onClick={() => onOpenRun(finding.analysisRunId!)} className="underline decoration-line-2 underline-offset-[3px] hover:text-ink hover:decoration-ink-3">Analysis #{finding.analysisRunId}</button>
                : <span>{finding.sourceKind === "manual" ? "Added by hand" : "From a deleted analysis"}</span>}
              {reviewedDate && <><span className="text-ink-3">·</span><span>{reviewedDate}</span></>}
              <span className="ml-auto"><DeleteFindingDialog projectId={finding.projectId} findingId={finding.id} disabled={busy} onDeleted={onUpdated} /></span>
            </div>
          </>
        )}
        {mutation.isError && <p role="alert" className="mt-2 text-[13px] text-conflict">Couldn’t save this finding: {mutation.error.message}</p>}
      </div>
    </article>
  );
}
