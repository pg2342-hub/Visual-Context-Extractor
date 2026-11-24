import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil } from "lucide-react";
import {
  getListProjectAnalysisRunsQueryKey,
  getListProjectFindingsQueryKey,
  useUpdateProjectFinding,
  type ProjectFinding,
  type ProjectFindingType,
} from "@workspace/api-client-react";
import { FindingMark, KIND_LABEL, SourceChip, sourceText } from "@/components/marks";
import { cn } from "@/lib/utils";

type Verdict = "confirmed" | "open_conflict" | "dismissed";

export function ProjectCandidateReview({
  projectId,
  candidates,
  onHighlight,
  activeId = null,
}: {
  projectId: number;
  candidates: ProjectFinding[];
  onHighlight?: (id: number | null) => void;
  activeId?: number | null;
}) {
  const queryClient = useQueryClient();
  const mutation = useUpdateProjectFinding();
  const [drafts, setDrafts] = useState<Record<number, { statement: string; type: ProjectFindingType }>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState<Record<number, Verdict>>({});
  const [filter, setFilter] = useState<"all" | ProjectFindingType>("all");

  const draftOf = (item: ProjectFinding) => drafts[item.id] ?? { statement: item.statement, type: item.type };
  const review = (item: ProjectFinding, status: Verdict) => {
    const draft = draftOf(item);
    mutation.mutate(
      { id: projectId, findingId: item.id, data: { statement: draft.statement.trim(), type: draft.type, status } },
      {
        onSuccess: () => {
          setReviewed((old) => ({ ...old, [item.id]: status }));
          setEditing(null);
          void queryClient.invalidateQueries({ queryKey: getListProjectFindingsQueryKey(projectId) });
          void queryClient.invalidateQueries({ queryKey: getListProjectAnalysisRunsQueryKey(projectId) });
        },
      },
    );
  };

  if (!candidates.length) return null;
  const numbered = candidates.map((item, i) => ({ item, n: i + 1 }));
  const counts = {
    all: candidates.length,
    fact: candidates.filter((c) => draftOf(c).type === "fact").length,
    conflict: candidates.filter((c) => draftOf(c).type === "conflict").length,
    open_question: candidates.filter((c) => draftOf(c).type === "open_question").length,
  };
  const shown = numbered.filter(({ item }) => filter === "all" || draftOf(item).type === filter);
  const pending = candidates.filter((c) => c.status === "pending" && !reviewed[c.id]).length;

  return (
    <section aria-labelledby="review-h" className="flex flex-col gap-3">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="review-h" className="text-[16px] font-semibold text-ink">Proposed findings</h2>
          <span className="font-mono text-[12px] text-ink-2">{pending} to review</span>
        </div>
        <p className="mt-0.5 text-[13px] text-ink-2">Nothing joins project memory until you confirm it.</p>
      </div>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter findings">
        {([
          ["all", "All"],
          ["fact", "Facts"],
          ["conflict", "Conflicts"],
          ["open_question", "Questions"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
              filter === value ? "border-ink bg-ink text-surface" : "border-line-2 text-ink-2 hover:text-ink",
            )}
          >
            {label} <span className="font-mono text-[11.5px] opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>

      <ol className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {shown.map(({ item, n }) => {
          const draft = draftOf(item);
          const verdict = reviewed[item.id] ?? (item.status !== "pending" ? (item.status as Verdict) : undefined);
          const isEditing = editing === item.id;
          return (
            <li
              key={item.id}
              id={`finding-${item.id}`}
              data-testid={`candidate-${item.id}`}
              onMouseEnter={() => onHighlight?.(item.id)}
              onMouseLeave={() => onHighlight?.(null)}
              onFocus={() => onHighlight?.(item.id)}
              className={cn("grid scroll-mt-32 grid-cols-[22px_minmax(0,1fr)] gap-3 border-t border-line px-4 py-4 transition-colors first:border-t-0", activeId === item.id && "bg-canvas")}
            >
              <FindingMark type={draft.type} n={n} muted={Boolean(verdict)} className="mt-px" />
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <label className="relative">
                    <span className="sr-only">Kind of finding</span>
                    <select
                      data-testid={`select-candidate-type-${item.id}`}
                      value={draft.type}
                      disabled={Boolean(verdict)}
                      onChange={(event) => setDrafts((old) => ({ ...old, [item.id]: { ...draft, type: event.target.value as ProjectFindingType } }))}
                      className={cn(
                        "cursor-pointer appearance-none rounded bg-transparent pr-1 text-[13px] font-medium outline-none disabled:cursor-default",
                        draft.type === "fact" ? "text-fact" : draft.type === "conflict" ? "text-conflict" : "text-question",
                      )}
                    >
                      {(Object.keys(KIND_LABEL) as ProjectFindingType[]).map((t) => (
                        <option key={t} value={t}>{KIND_LABEL[t]}</option>
                      ))}
                    </select>
                  </label>
                  {!verdict && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setEditing(item.id)}
                      className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[12px] text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    aria-label="Edit finding"
                    data-testid={`input-candidate-${item.id}`}
                    autoFocus
                    value={draft.statement}
                    onChange={(event) => setDrafts((old) => ({ ...old, [item.id]: { ...draft, statement: event.target.value } }))}
                    rows={3}
                    maxLength={2000}
                    className="mt-1.5 w-full resize-y rounded-md border border-line-2 bg-surface px-2.5 py-2 text-[14px] leading-6 text-ink outline-none focus:border-ink-3"
                  />
                ) : (
                  <p className={cn("mt-1 text-[14px] leading-6", verdict === "dismissed" ? "text-ink-3 line-through" : verdict ? "text-ink-2" : "text-ink")}>
                    {draft.statement}
                  </p>
                )}

                {item.sourceRefs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.sourceRefs.map((ref, i) => (
                      <SourceChip key={ref}>{sourceText(ref, item.sourceLabels[i])}</SourceChip>
                    ))}
                  </div>
                )}

                {verdict ? (
                  <p className={cn("mt-2.5 inline-flex items-center gap-1.5 text-[13px]", verdict === "confirmed" ? "text-ok" : verdict === "open_conflict" ? "text-conflict" : "text-ink-3")}>
                    {verdict === "confirmed" && <Check className="h-3.5 w-3.5" />}
                    {verdict === "confirmed"
                      ? draft.type === "open_question" ? "Kept as an open question" : "Confirmed, now in project memory"
                      : verdict === "open_conflict" ? "Kept as an open conflict" : "Dismissed"}
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      data-testid={`button-confirm-candidate-${item.id}`}
                      disabled={mutation.isPending || !draft.statement.trim()}
                      onClick={() => review(item, "confirmed")}
                      className="inline-flex h-7 items-center rounded-md bg-ink px-2.5 text-[13px] font-medium text-surface transition-opacity hover:opacity-85 disabled:opacity-50"
                    >
                      {draft.type === "open_question" ? "Keep open" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      data-testid={`button-conflict-candidate-${item.id}`}
                      disabled={mutation.isPending || !draft.statement.trim()}
                      onClick={() => review(item, "open_conflict")}
                      className="inline-flex h-7 items-center rounded-md border border-line-2 px-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-50"
                    >
                      Mark as conflict
                    </button>
                    <button
                      type="button"
                      data-testid={`button-dismiss-candidate-${item.id}`}
                      disabled={mutation.isPending}
                      onClick={() => review(item, "dismissed")}
                      className="inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-subtle hover:text-ink disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-ink-2">No findings of this kind in this run.</li>}
      </ol>
      {mutation.isError && (
        <p role="alert" className="text-[13px] text-conflict">
          Couldn’t save that review: {mutation.error.message}. Try again.
        </p>
      )}
    </section>
  );
}
