import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { FileText, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type {
  ProjectDocument,
  ProjectDocumentsResponse,
  ProjectDocumentUploadResponse,
} from "@workspace/api-client-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENTS = 20;
const ACCEPTED_TYPES = ".pdf,.docx,.txt,.md,.markdown,.csv,.json,.yaml,.yml";
const supportedTypesLabel = "PDF, DOCX, TXT, Markdown, CSV, JSON, or YAML";

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: string;
  };
  return new Error(body.details || body.error || fallback);
}

async function loadProjectDocuments(projectId: number): Promise<ProjectDocument[]> {
  const response = await fetch(`/api/projects/${projectId}/documents`, {
    credentials: "include",
  });
  if (!response.ok) throw await responseError(response, "Could not load project documents.");
  const body = (await response.json()) as ProjectDocumentsResponse;
  return body.documents;
}

async function uploadProjectDocument(projectId: number, file: File): Promise<ProjectDocument> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Each project document must be 10 MB or smaller.");
  }
  const contentType = file.type || "application/octet-stream";
  const urlResponse = await fetch(`/api/projects/${projectId}/documents/upload-url`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      sizeBytes: file.size,
      contentType,
    }),
  });
  if (!urlResponse.ok) {
    throw await responseError(urlResponse, "Could not prepare the document upload.");
  }
  const { uploadURL, objectPath } =
    (await urlResponse.json()) as ProjectDocumentUploadResponse;

  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("The file could not be uploaded to private storage. Please try again.");
  }

  const finalizeResponse = await fetch(`/api/projects/${projectId}/documents`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      sizeBytes: file.size,
      contentType,
      objectPath,
    }),
  });
  if (!finalizeResponse.ok) {
    throw await responseError(finalizeResponse, "Could not add the uploaded document.");
  }
  return (await finalizeResponse.json()) as ProjectDocument;
}

async function removeProjectDocument(projectId: number, documentId: number): Promise<void> {
  const response = await fetch(
    `/api/projects/${projectId}/documents/${documentId}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!response.ok) throw await responseError(response, "Could not remove the document.");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectDocuments({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const documentsQueryKey = ["project-documents", projectId] as const;
  const documentsQuery = useQuery({
    queryKey: documentsQueryKey,
    queryFn: () => loadProjectDocuments(projectId),
  });
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadProjectDocument(projectId, file),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
    onError: (error) => setMutationError(error.message),
  });
  const removeMutation = useMutation({
    mutationFn: (documentId: number) => removeProjectDocument(projectId, documentId),
    onSuccess: async () => {
      setMutationError(null);
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
    onError: (error) => setMutationError(error.message),
  });
  const documents = documentsQuery.data ?? [];
  const isBusy = uploadMutation.isPending || removeMutation.isPending;

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    setMutationError(null);
    uploadMutation.mutate(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-base font-semibold text-ink">Reference documents</h4>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink-2">
            Add client documentation for the analyzer to use as background. Supported formats:
            {" "}{supportedTypesLabel}. Maximum 10 MB each, up to {MAX_DOCUMENTS} files.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="sr-only"
          aria-label="Choose a project reference document"
          disabled={isBusy || documents.length >= MAX_DOCUMENTS}
          onChange={(event) => selectFile(event.currentTarget.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy || documents.length >= MAX_DOCUMENTS}
          className="inline-flex shrink-0 items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploadMutation.isPending
            ? <LoaderCircle className="h-4 w-4 animate-spin" />
            : <Upload className="h-4 w-4" />}
          {uploadMutation.isPending ? "Uploading…" : "Upload document"}
        </button>
      </div>

      {(mutationError || documentsQuery.error) && (
        <p role="alert" className="mt-4 rounded-md bg-conflict-bg px-3 py-2.5 text-sm text-conflict">
          {mutationError || (documentsQuery.error as Error).message}
        </p>
      )}

      {documentsQuery.isPending ? (
        <p className="mt-5 text-sm text-ink-2">Loading reference documents…</p>
      ) : documentsQuery.isError ? null : documents.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-line-2 px-4 py-5 text-sm text-ink-2">
          No reference documents have been added to this project.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 px-4 py-3">
              <FileText className="h-5 w-5 shrink-0 text-ink-2" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{document.originalName}</p>
                <p className="mt-0.5 text-xs text-ink-2">
                  {formatBytes(document.sizeBytes)} · Added{" "}
                  {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${document.originalName}`}
                title="Remove document"
                disabled={isBusy}
                onClick={() => {
                  if (window.confirm(`Remove “${document.originalName}” from this project?`)) {
                    removeMutation.mutate(document.id);
                  }
                }}
                className="rounded-md p-2 text-ink-3 hover:bg-conflict-bg hover:text-conflict disabled:opacity-50"
              >
                {removeMutation.isPending && removeMutation.variables === document.id
                  ? <LoaderCircle className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
