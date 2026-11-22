# Vision Context Extractor

Turns screenshots and system diagrams into source-cited project findings with Claude, so a consultant can build up a reviewed picture of a client's systems one image at a time.

## What it does

Upload one or more images (PNG, JPEG, WebP or GIF) and pick an analysis mode. Every mode returns a summary, any readable text, and tags, plus a structured result for that mode.

| Mode | What comes back |
|---|---|
| Summarize | Key observations and the broader context |
| Extract data points | Chart or table type, every data point with label, value and unit, axes, and insights |
| Identify UI elements | Layout, each element with its type, location, purpose and state, color scheme, and accessibility notes |
| Describe code | Language, what the code does, issues, and a corrected version with steps |
| System design | Systems and their roles, integrations, data flows, risks, recommendations, and open questions for the client |

The system design prompt keeps what is visible apart from what is inferred, and says "unclear" instead of inventing vendors, protocols or infrastructure.

## Client projects and reviewed findings

Analyses can run inside a client project, which holds:

- **Project knowledge**: free-text notes about the client.
- **Reference documents**: PDF, Word, text, Markdown, CSV, JSON or YAML files. Their text is passed to the model as untrusted reference material (up to 40,000 characters per analysis).
- **Approved source metadata**: schema and object descriptions for connected systems, used only in system design mode. No source records are fetched.

Each analysis proposes up to eight findings, each a **fact**, a **conflict** between sources, or an **open question**, and each cites the image or document it came from (`IMG-1`, `DOC-…`, `PROJECT_KNOWLEDGE`). Findings start as pending, and nothing becomes project memory until a person confirms or dismisses it. Confirmed facts and open conflicts are fed into later analyses, so when a new image disagrees with something already confirmed, the model reports the discrepancy instead of picking a side. Every analysis run is saved with the memory it used, so past results can be reviewed.

Image text, documents and metadata are all treated as content, never as instructions to the model.

## Stack

pnpm monorepo in TypeScript:

- `artifacts/image-analyzer`: React + Vite front end
- `artifacts/api-server`: Express 5 API (`/api/analyze`, `/api/projects/...`)
- `lib/db`: PostgreSQL with Drizzle ORM
- `lib/api-spec`: OpenAPI spec with Orval codegen for React Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`)
- Claude (Anthropic API) for analysis, Clerk for sign-in

## Run it

Built on Replit, which supplies the database and the Anthropic integration. To run it elsewhere you need Node 24, pnpm, a PostgreSQL database, an Anthropic API key, and Clerk keys, all set as environment variables (`DATABASE_URL`, `CLERK_SECRET_KEY`, `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, and `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`).

```
pnpm install
pnpm --filter @workspace/db run push              # create the tables
pnpm --filter @workspace/api-server run dev       # API
pnpm --filter @workspace/image-analyzer run dev   # front end
pnpm --filter @workspace/api-server run test      # tests
```

No keys are stored in this repository.
