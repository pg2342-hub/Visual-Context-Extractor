import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useDeleteProjectAnalysisRun } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function DeleteAnalysisDialog({
  projectId, runId, label, onDeleted,
}: {
  projectId: number;
  runId: number;
  label: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [keepReviewed, setKeepReviewed] = useState(true);
  const deletion = useDeleteProjectAnalysisRun();

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (deletion.isPending) return;
      if (next) {
        setKeepReviewed(true);
        deletion.reset();
      }
      setOpen(next);
    }}>
      <AlertDialogTrigger asChild>
        <button type="button" data-testid={`button-delete-run-${runId}`}
          aria-label={`Delete analysis: ${label}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-[#a25a55] hover:bg-[#fff3f1]">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border-[#dfeaec] bg-white sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#2b4654]">Delete this analysis?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#607681]">
            {label}. This permanently deletes the saved result and its unreviewed candidates. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfeaec] bg-[#f8fbfc] p-4 text-sm text-[#405b68]">
          <input type="checkbox" data-testid="checkbox-keep-reviewed-findings"
            checked={keepReviewed} disabled={deletion.isPending}
            onChange={(event) => setKeepReviewed(event.target.checked)}
            className="mt-1 accent-[#347f9d]" />
          <span><span className="font-semibold">Keep reviewed findings in this project</span>
            <span className="mt-1 block text-xs leading-5 text-[#718891]">
              Preserve reviewed facts, conflicts, dismissed and retired findings, including their reviewer and source details.
              Uncheck to delete all findings from this analysis too.
            </span>
          </span>
        </label>
        {deletion.isError && <p role="alert" className="text-sm text-red-700">{deletion.error.message || "The analysis couldn’t be deleted. Try again."}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="button-confirm-delete-analysis"
            disabled={deletion.isPending}
            className="bg-[#a34f48] text-white hover:bg-[#8f403a]"
            onClick={(event) => {
              event.preventDefault();
              deletion.mutate({
                id: projectId, runId, data: { keepReviewedFindings: keepReviewed },
              }, { onSuccess: () => { setOpen(false); onDeleted(); } });
            }}>
            {deletion.isPending ? "Deleting…" : "Delete analysis"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
