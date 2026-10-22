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
import { clientProjects } from "./client-projects";

export type ProjectMemoryEntry = {
  id: number;
  statement: string;
  sourceLabels: string[];
};

export type ProjectMemorySnapshot = {
  confirmedFacts: ProjectMemoryEntry[];
  openConflicts: ProjectMemoryEntry[];
  openQuestions?: ProjectMemoryEntry[];
};

export const clientProjectAnalysisRuns = pgTable(
  "client_project_analysis_runs",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => clientProjects.id, { onDelete: "cascade" }),
    createdBy: text("created_by").notNull(),
    mode: text("mode").notNull(),
    imageNames: jsonb("image_names").$type<string[]>().notNull(),
    summary: text("summary").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    memorySnapshot: jsonb("memory_snapshot")
      .$type<ProjectMemorySnapshot>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("client_project_analysis_runs_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const insertClientProjectAnalysisRunSchema = createInsertSchema(
  clientProjectAnalysisRuns,
).omit({
  id: true,
  createdAt: true,
});

export type InsertClientProjectAnalysisRun = z.infer<
  typeof insertClientProjectAnalysisRunSchema
>;
export type ClientProjectAnalysisRun =
  typeof clientProjectAnalysisRuns.$inferSelect;
