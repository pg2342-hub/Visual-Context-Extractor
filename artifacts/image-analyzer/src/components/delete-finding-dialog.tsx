import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useDeleteProjectFinding } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function DeleteFindingDialog({ projectId, findingId, disabled, onDeleted }: {
  projectId: number;
  findingId: number;
  disabled: boolean;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const deletion = useDeleteProjectFinding();

  return (
    <AlertDialog open={open} onOpenChange={(next) => {
      if (deletion.isPending) return;
      if (next) deletion.reset();
      setOpen(next);
    }}>
      <AlertDialogTrigger asChild>
        <button type="button" disabled={disabled}
          data-testid={`button-delete-finding-${findingId}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#a25a55] hover:bg-[#fff3f1] disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl border-[#dfeaec] bg-white sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#2b4654]">Delete this finding?</AlertDialogTitle>
          <AlertDialogDescription className="text-[#607681]">
            This permanently removes it from the project and it will no longer be used in future analyses. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletion.isError && <p role="alert" className="text-sm text-red-700">
          {deletion.error.message || "The finding couldn’t be deleted. Try again."}
        </p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deletion.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction data-testid="button-confirm-delete-finding"
            disabled={deletion.isPending}
            className="bg-[#a34f48] text-white hover:bg-[#8f403a]"
            onClick={(event) => {
              event.preventDefault();
              deletion.mutate({ id: projectId, findingId }, {
                onSuccess: () => { setOpen(false); onDeleted(); },
              });
            }}>
            {deletion.isPending ? "Deleting…" : "Delete finding"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
