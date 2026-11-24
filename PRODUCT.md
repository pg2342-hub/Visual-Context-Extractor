# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Consultants who have been given access. They map a client's systems and processes from screenshots, diagrams, dashboards and code, usually during discovery or a systems review. They work on a laptop or desktop, at a desk, often with the client's material open in other windows. Phones are not a primary use.

## Product Purpose

Visual Context Extractor turns screenshots and system diagrams into structured, source-cited context. A consultant uploads one or more images, picks a lens, and gets a structured reading of them. Inside a client project, each analysis also proposes findings that the consultant confirms or dismisses, building up a reviewed picture of the client's systems one image at a time.

Success: a consultant goes from "a pile of client screenshots" to "a reviewed set of facts, conflicts and open questions about this client" without retyping what is in the images, and without the tool inventing things that are not there.

## Positioning

- Findings are proposals, not answers. Nothing becomes project memory until a person confirms or dismisses it.
- Every finding cites where it came from: an image (`IMG-1`), a reference document (`DOC-…`) or the project notes (`PROJECT_KNOWLEDGE`).
- What is visible is kept apart from what is inferred. The tool says "unclear" rather than inventing vendors, protocols or infrastructure.
- When a new image disagrees with something already confirmed, it reports the conflict instead of picking a side.

## Operating Context

- Material arrives as screenshots of client tools, architecture diagrams, dashboards, charts, tables and code, often pasted straight from the clipboard, several at a time.
- Work happens per client. Each client project holds free-text knowledge notes, reference documents (PDF, Word, text, Markdown, CSV, JSON, YAML; up to 40,000 characters passed per analysis), and approved source metadata (schema and object descriptions for connected systems, used only in system design mode; no records are fetched).
- Past analysis runs are saved with the memory they used, so a consultant can go back and review them.

## Capabilities and Constraints

- Five lenses, each returning a summary, readable text and tags plus a lens-specific structure:
  - Summarize: key observations and broader context.
  - Extract data points: chart or table type, each data point with label, value and unit, axes, insights.
  - Identify UI elements: layout, each element with type, location, purpose and state, color scheme, accessibility notes.
  - Describe code: language, what it does, issues, corrected version with steps.
  - System design: systems and roles, integrations, data flows, risks, recommendations, open questions for the client.
- Findings: up to eight per analysis, each a fact, a conflict or an open question, each pending until confirmed or dismissed.
- Images: PNG, JPEG, WebP, GIF; multiple per analysis; drop, browse or paste.
- Anonymous use runs single analyses; client projects require sign-in (Clerk).
- Analysis runs on Claude via the Anthropic API. Image text, documents and metadata are treated as content, never as instructions.
- Stack: pnpm monorepo, React + Vite front end, Express API, PostgreSQL with Drizzle, OpenAPI with generated React Query hooks. Built and hosted on Replit, mirrored to GitHub.
- Nothing in the current UI copy or naming is binding; any of it may change as long as every function above keeps working.

## Brand Commitments

- Name: Visual Context Extractor.
- Will appear as a tile on the owner's portfolio (pranavgudise.dev), but has its own visual identity, separate from the portfolio's.

## Evidence on Hand

- Live app: https://context-extractor.replit.app
- README in the repository describes behavior accurately.
- No customers, testimonials, usage numbers or benchmarks exist. Do not invent any.

## Product Principles

1. The consultant decides. The tool proposes; a person confirms. Review is the core act, not an afterthought.
2. Always show the source. Every claim should be traceable to the image or document it came from.
3. Visible versus inferred, never blurred. Uncertainty is stated plainly.
4. Built for repeated, focused desk work: fast intake, dense but calm reading, nothing in the way of the next image.
5. One client at a time. Project context should always be obvious, so findings never land in the wrong client.
