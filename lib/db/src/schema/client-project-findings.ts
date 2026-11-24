import { createInsertSchema } from "drizzle-zod";
import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { clientProjectAnalysisRuns } from "./client-project-analysis-runs";
import { clientProjects } from "./client-projects";

export type ProjectFindingType = "fact" | "conflict" | "open_question";
export type ProjectFindingStatus =
  | "pending"
  | "confirmed"
  | "open_conflict"
  | "dismissed"
  | "retired";
export type ProjectFindingSourceKind =
  | "image"
  | "project_document"
  | "project_knowledge"
  | "multiple"
  | "manual";

/** Where a finding is visible in a cited image, as fractions (0 to 1) of the image's width and height. */
export interface FindingImageRegion {
  imageRef: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const clientProjectFindings = pgTable(
  "client_project_findings",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => clientProjects.id, { onDelete: "cascade" }),
    analysisRunId: integer("analysis_run_id").references(
      () => clientProjectAnalysisRuns.id,
      { onDelete: "cascade" },
    ),
    statement: text("statement").notNull(),
    type: text("finding_type").$type<ProjectFindingType>().notNull(),
    status: text("status").$type<ProjectFindingStatus>().notNull(),
    sourceKind: text("source_kind").$type<ProjectFindingSourceKind>().notNull(),
    sourceRefs: jsonb("source_refs").$type<string[]>().notNull(),
    sourceLabels: jsonb("source_labels").$type<string[]>().notNull(),
    regions: jsonb("regions").$type<FindingImageRegion[]>().notNull().default([]),
    createdBy: text("created_by").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("client_project_findings_project_status_idx").on(
      table.projectId,
      table.status,
    ),
    index("client_project_findings_analysis_run_idx").on(table.analysisRunId),
  ],
);

export const insertClientProjectFindingSchema = createInsertSchema(
  clientProjectFindings,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientProjectFinding = z.infer<
  typeof insertClientProjectFindingSchema
>;
export type ClientProjectFinding = typeof clientProjectFindings.$inferSelect;
