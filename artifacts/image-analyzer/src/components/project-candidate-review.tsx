import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListProjectAnalysisRunsQueryKey,
  getListProjectFindingsQueryKey,
  useUpdateProjectFinding,
  type ProjectFinding,
  type ProjectFindingType,
} from "@workspace/api-client-react";

export function ProjectCandidateReview({ projectId, candidates }: { projectId: number; candidates: ProjectFinding[] }) {
  const queryClient = useQueryClient();
  const mutation = useUpdateProjectFinding();
  const [drafts, setDrafts] = useState<Record<number, { statement: string; type: ProjectFindingType }>>({});
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const updateDraft = (item: ProjectFinding) => drafts[item.id] ?? { statement: item.statement, type: item.type };
  const review = (item: ProjectFinding, status: "confirmed" | "open_conflict" | "dismissed") => {
    const draft = updateDraft(item);
    mutation.mutate({ id: projectId, findingId: item.id, data: { statement: draft.statement.trim(), type: draft.type, status } }, { onSuccess: () => {
      setReviewedIds((ids) => [...ids, item.id]);
      void queryClient.invalidateQueries({ queryKey: getListProjectFindingsQueryKey(projectId) });
      void queryClient.invalidateQueries({ queryKey: getListProjectAnalysisRunsQueryKey(projectId) });
    } });
  };
  if (!candidates.length) return null;
  const pendingCandidates = candidates.filter((item) => item.status === "pending" && !reviewedIds.includes(item.id));
  return (
    <section className="rounded-[18px] border border-[#dce9e5] bg-[#f6faf7] p-5 sm:p-6">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#638574]">Human review</p>
        <h3 className="mt-1 font-display text-lg font-semibold text-[#355848]">Findings to carry forward</h3>
        <p className="mt-1 text-sm text-[#71857a]">Check these observations before they become project knowledge.</p>
      </div>
      {pendingCandidates.length ? <div className="space-y-3">{pendingCandidates.map((item) => {
        const draft = updateDraft(item);
        return (
          <div key={item.id} className="rounded-xl border border-[#e0ebe4] bg-white p-4">
            <textarea aria-label="Edit candidate finding" data-testid={`input-candidate-${item.id}`} value={draft.statement}
              onChange={(event) => setDrafts((old) => ({ ...old, [item.id]: { ...draft, statement: event.target.value } }))}
              rows={2} maxLength={2000} className="w-full resize-y rounded-lg border border-[#e2ebe6] bg-[#fcfdfc] px-3 py-2 text-sm leading-6 text-[#405b4b] outline-none focus:border-[#9ab9a1]"/>
            {item.sourceLabels.length > 0 && <p className="mt-2 text-[11px] text-[#89988e]">Sources: {item.sourceLabels.join(", ")}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-medium text-[#708579]">Kind
                <select data-testid={`select-candidate-type-${item.id}`} value={draft.type}
                  onChange={(event) => setDrafts((old) => ({ ...old, [item.id]: { ...draft, type: event.target.value as ProjectFindingType } }))}
                  className="ml-2 h-8 rounded-md border border-[#dfe9e2] bg-white px-2 text-xs">
                  <option value="fact">Fact</option><option value="conflict">Conflict</option><option value="open_question">Open question</option>
                </select>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" data-testid={`button-confirm-candidate-${item.id}`} disabled={mutation.isPending || !draft.statement.trim()}
                  onClick={() => review(item,"confirmed")} className="rounded-md bg-[#e8f3ec] px-2.5 py-1.5 text-xs font-semibold text-[#3c7557] hover:bg-[#dceee3]">
                  {draft.type === "open_question" ? "Keep as open question" : "Confirm"}
                </button>
                <button type="button" data-testid={`button-conflict-candidate-${item.id}`} disabled={mutation.isPending || !draft.statement.trim()}
                  onClick={() => review(item,"open_conflict")} className="rounded-md bg-[#fbf3e7] px-2.5 py-1.5 text-xs font-semibold text-[#967142] hover:bg-[#f6ead7]">Mark as open conflict</button>
                <button type="button" data-testid={`button-dismiss-candidate-${item.id}`} disabled={mutation.isPending}
                  onClick={() => review(item,"dismissed")} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-[#829097] hover:bg-[#f1f5f5]">Dismiss</button>
              </div>
            </div>
          </div>
        );
      })}</div> : <p className="rounded-xl border border-dashed border-[#dce9e5] bg-white/70 px-4 py-3 text-sm text-[#74877b]">All suggested findings have been reviewed.</p>}
      {mutation.isError && <p role="alert" className="mt-3 text-sm text-red-700">Couldn’t save the review: {mutation.error.message}</p>}
    </section>
  );
}
