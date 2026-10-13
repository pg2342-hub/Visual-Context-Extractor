import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CircleHelp,
  Database,
  LoaderCircle,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  ProjectConnectionProvider,
  type ProjectConnection,
  type ProjectConnectionInput,
  type ProjectConnectionUpdate,
} from "@workspace/api-client-react";

const PROVIDER_LABELS: Record<ProjectConnectionInput["provider"], string> = {
  postgres: "PostgreSQL",
  mysql: "MySQL",
  sqlserver: "Microsoft SQL Server",
  snowflake: "Snowflake",
  bigquery: "Google BigQuery",
  databricks: "Databricks",
  redshift: "Amazon Redshift",
  mongodb: "MongoDB",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
};

async function readError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    details?: string;
  };
  return new Error(body.details || body.error || fallback);
}

async function loadConnections(projectId: number): Promise<ProjectConnection[]> {
  const response = await fetch(`/api/projects/${projectId}/connections`, {
    credentials: "include",
  });
  if (!response.ok) throw await readError(response, "Could not load project sources.");
  const body = (await response.json()) as { connections: ProjectConnection[] };
  return body.connections;
}

export function ProjectConnections({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["project-connections", projectId] as const;
  const [provider, setProvider] = useState<ProjectConnectionInput["provider"]>(
    ProjectConnectionProvider.postgres,
  );
  const [displayName, setDisplayName] = useState("");
  const [credentials, setCredentials] = useState("");
  const [metadata, setMetadata] = useState("");
  const [includeInAnalysis, setIncludeInAnalysis] = useState(false);
  const [metadataDrafts, setMetadataDrafts] = useState<Record<number, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const connectionsQuery = useQuery({
    queryKey,
    queryFn: () => loadConnections(projectId),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const addMutation = useMutation({
    mutationFn: async (input: ProjectConnectionInput) => {
      const response = await fetch(`/api/projects/${projectId}/connections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw await readError(response, "Could not save this source.");
      return (await response.json()) as ProjectConnection;
    },
    onSuccess: () => {
      setDisplayName("");
      setCredentials("");
      setMetadata("");
      setIncludeInAnalysis(false);
      setActionError(null);
      void refresh();
    },
    onError: (error) => setActionError(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      connectionId,
      update,
    }: {
      connectionId: number;
      update: ProjectConnectionUpdate;
    }) => {
      const response = await fetch(
        `/api/projects/${projectId}/connections/${connectionId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(update),
        },
      );
      if (!response.ok) throw await readError(response, "Could not update source settings.");
      return (await response.json()) as ProjectConnection;
    },
    onSuccess: (connection) => {
      setMetadataDrafts((drafts) => {
        const next = { ...drafts };
        delete next[connection.id];
        return next;
      });
      setActionError(null);
      void refresh();
    },
    onError: (error) => setActionError(error.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await fetch(
        `/api/projects/${projectId}/connections/${connectionId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) throw await readError(response, "Could not disconnect this source.");
    },
    onSuccess: () => {
      setActionError(null);
      void refresh();
    },
    onError: (error) => setActionError(error.message),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    addMutation.mutate({
      provider,
      displayName: displayName.trim(),
      credentials,
      metadata,
      includeInAnalysis,
    });
  };

  return (
    <div className="max-w-3xl">
      <h3 className="flex items-center gap-2 font-display text-xl font-semibold tracking-[-.035em] text-[#2b4654]">
        <Database className="h-5 w-5 text-blue-700" />
        Project integrations
      </h3>
      <p className="mt-1 text-[13px] leading-6 text-[#82929a]">
        Add client-authorized read-only credentials for a single project. Only approved schema and object metadata can be used in System Design analysis.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#dcebef] bg-[#f2f9fa] px-4 py-3 text-[13px] leading-6 text-[#4f6f7b]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#347f9d]" />
        <p>
          Credentials are encrypted before storage, scoped to this project, and never returned to the browser after saving. They are not tested against the provider, and this analyzer does not run source queries or retrieve client records. Add schema/object descriptions yourself and enter no sample rows or customer data.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-4 rounded-2xl border border-[#dfeaec] bg-white p-4 sm:p-5"
      >
        <h4 className="font-semibold text-[#38515e]">Authorize a source</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Source type
            <select
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as ProjectConnectionInput["provider"])
              }
              className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
            >
              {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Connection name
            <input
              required
              value={displayName}
              maxLength={120}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Production warehouse"
              className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Read-only credential
          <input
            required
            type="password"
            autoComplete="new-password"
            value={credentials}
            maxLength={50000}
            onChange={(event) => setCredentials(event.target.value)}
            placeholder="Connection string, access token, or provider credential"
            className="mt-1.5 h-11 w-full rounded-lg border border-[#dce8eb] bg-white px-3 outline-none focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
          />
          <span className="mt-1 block text-xs font-normal leading-5 text-[#82929a]">
            Use a credential limited to read-only schema/metadata permissions. It is cleared from this form after saving and is not tested by this app.
          </span>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Schema or object metadata
          <textarea
            value={metadata}
            maxLength={30000}
            rows={5}
            onChange={(event) => setMetadata(event.target.value)}
            placeholder={"Optional: object/table names, fields, types, and relationships. Do not include records or sample values."}
            className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
          />
        </label>
        <label className="flex items-start gap-2 text-sm text-[#4f6f7b]">
          <input
            type="checkbox"
            checked={includeInAnalysis}
            onChange={(event) => setIncludeInAnalysis(event.target.checked)}
            className="mt-1 accent-[#347f9d]"
          />
          Include this metadata in System Design analysis
        </label>
        {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
        <div>
          <button
            type="submit"
            disabled={addMutation.isPending || !displayName.trim() || !credentials.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#347f9d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#286d88] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {addMutation.isPending
              ? <LoaderCircle className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            {addMutation.isPending ? "Saving securely…" : "Save source"}
          </button>
        </div>
      </form>

      <div className="mt-7">
        <h4 className="font-semibold text-[#38515e]">Authorized sources</h4>
        {connectionsQuery.isPending && (
          <p className="mt-3 text-sm text-[#82929a]">Loading project sources…</p>
        )}
        {connectionsQuery.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {connectionsQuery.error.message}
          </p>
        )}
        {connectionsQuery.isSuccess && connectionsQuery.data.length === 0 && (
          <div className="mt-3 flex items-start gap-3 rounded-xl border border-dashed border-[#cbdfe4] bg-[#f8fbfc] p-4">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#7597a3]" />
            <p className="text-[13px] leading-6 text-[#71838d]">
              No sources are authorized for this project yet. Connections added here are not shared with other client projects.
            </p>
          </div>
        )}
        <div className="mt-3 grid gap-3">
          {connectionsQuery.data?.map((connection) => {
            const currentMetadata =
              metadataDrafts[connection.id] ?? connection.metadata;
            const metadataChanged = currentMetadata !== connection.metadata;
            return (
              <article
                key={connection.id}
                className="rounded-xl border border-[#dfeaec] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h5 className="font-semibold text-[#38515e]">{connection.displayName}</h5>
                    <p className="mt-0.5 text-xs text-[#82929a]">
                      {PROVIDER_LABELS[connection.provider]} · Credential stored encrypted (not verified)
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Disconnect ${connection.displayName}`}
                    disabled={disconnectMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Disconnect “${connection.displayName}” and delete its stored credential?`)) {
                        disconnectMutation.mutate(connection.id);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#a44f49] hover:bg-[#fff4f2] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Disconnect
                  </button>
                </div>
                <label className="mt-4 block text-sm font-medium text-slate-700">
                  Schema or object metadata
                  <textarea
                    value={currentMetadata}
                    maxLength={30000}
                    rows={4}
                    onChange={(event) =>
                      setMetadataDrafts((drafts) => ({
                        ...drafts,
                        [connection.id]: event.target.value,
                      }))
                    }
                    placeholder="Add table/object names, fields, types, and relationships. Do not include records."
                    className="mt-1.5 w-full resize-y rounded-lg border border-[#dce8eb] bg-[#fbfdfe] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#78afc0] focus:ring-2 focus:ring-[#e0f0f3]"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-start gap-2 text-sm text-[#4f6f7b]">
                    <input
                      type="checkbox"
                      checked={connection.includeInAnalysis}
                      disabled={updateMutation.isPending}
                      onChange={(event) =>
                        updateMutation.mutate({
                          connectionId: connection.id,
                          update: { includeInAnalysis: event.target.checked },
                        })
                      }
                      className="mt-1 accent-[#347f9d]"
                    />
                    Approved for System Design analysis
                  </label>
                  {metadataChanged && (
                    <button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() =>
                        updateMutation.mutate({
                          connectionId: connection.id,
                          update: { metadata: currentMetadata },
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#cfe1e6] px-3 py-2 text-xs font-semibold text-[#347f9d] hover:bg-[#f2f9fa] disabled:opacity-50"
                    >
                      {updateMutation.isPending
                        ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />}
                      Save metadata
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
