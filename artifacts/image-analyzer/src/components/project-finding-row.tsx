import { useState } from "react";
import { useUpdateProjectFinding, type ProjectFinding, type ProjectFindingType } from "@workspace/api-client-react";
import { DeleteFindingDialog } from "@/components/delete-finding-dialog";

type ReviewStatus = "confirmed" | "open_conflict" | "dismissed" | "retired";

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
    : "Not reviewed yet";

  return (
    <article data-testid={`finding-${finding.id}`} className="rounded-xl border border-[#e4edef] bg-white/80 p-4">
      {editing ? <div className="space-y-3">
        <label className="block text-xs font-medium text-[#607681]">Statement
          <textarea autoFocus data-testid={`input-finding-statement-${finding.id}`}
            value={statement} onChange={(event) => setStatement(event.target.value)}
            maxLength={2000} rows={3} disabled={busy}
            className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-white px-3 py-2 text-sm leading-6 text-[#405b68] outline-none focus:border-[#78afc0]" />
        </label>
        <label className="block text-xs font-medium text-[#607681]">Finding type
          <select data-testid={`select-finding-type-${finding.id}`} value={type}
            disabled={busy} onChange={(event) => setType(event.target.value as ProjectFindingType)}
            className="ml-2 rounded-lg border border-[#dce8eb] bg-white px-2 py-2 text-sm">
            <option value="fact">Fact</option><option value="conflict">Conflict</option><option value="open_question">Open question</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button type="button" data-testid={`button-save-finding-${finding.id}`} disabled={disabled}
            onClick={() => save()} className="rounded-lg bg-[#347f9d] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" disabled={busy} onClick={() => { setEditing(false); mutation.reset(); }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#58737e] hover:bg-[#eaf3f5]">Cancel</button>
        </div>
      </div> : <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-6 text-[#405b68]">{finding.statement}</p>
        <button type="button" data-testid={`button-edit-finding-${finding.id}`} disabled={busy}
          onClick={() => { setStatement(finding.statement); setType(finding.type); mutation.reset(); setEditing(true); }}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-[#347f9d] hover:bg-[#eef7fa]">Edit</button>
      </div>}
      <p className="mt-2 text-[11px] text-[#81939a]">
        {finding.analysisRunId
          ? <button type="button" onClick={() => onOpenRun(finding.analysisRunId!)} className="underline underline-offset-2">Analysis #{finding.analysisRunId}</button>
          : finding.sourceKind === "manual" ? "Manual finding" : "Deleted analysis"}
        {" · "}{finding.reviewedBy ? "Reviewed by You" : "Awaiting review"} · {reviewedDate}
      </p>
      {finding.sourceLabels.length > 0 && <p className="mt-1 text-[11px] text-[#93a1a7]">Sources: {finding.sourceLabels.join(", ")}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#f0f5f6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b858e]">
          {finding.type.replace("_", " ")} · {finding.status === "confirmed" && finding.type === "open_question" ? "kept · unresolved" : finding.status.replace("_", " ")}
        </span>
        {finding.status !== "confirmed" && <button type="button" disabled={disabled} onClick={() => save("confirmed")} className="rounded-md px-2 py-1 text-xs font-medium text-[#3d7965] hover:bg-[#edf6f0]">{effectiveType === "open_question" ? "Keep as open question" : "Confirm"}</button>}
        {finding.status !== "open_conflict" && <button type="button" disabled={disabled} onClick={() => save("open_conflict")} className="rounded-md px-2 py-1 text-xs font-medium text-[#9a7140] hover:bg-[#fbf4e9]">Open conflict</button>}
        {finding.status !== "retired" && <button type="button" disabled={disabled} onClick={() => save("retired")} className="rounded-md px-2 py-1 text-xs font-medium text-[#71838d] hover:bg-[#f1f5f6]">Retire</button>}
        {finding.status !== "dismissed" && <button type="button" disabled={disabled} onClick={() => save("dismissed")} className="rounded-md px-2 py-1 text-xs font-medium text-[#a25a55] hover:bg-[#fff3f1]">Dismiss</button>}
      </div>
      <div className="mt-2">
        <DeleteFindingDialog projectId={finding.projectId} findingId={finding.id} disabled={busy} onDeleted={onUpdated}/>
      </div>
      {mutation.isError && <p role="alert" className="mt-2 text-sm text-red-700">Couldn’t save this finding: {mutation.error.message}</p>}
    </article>
  );
}
