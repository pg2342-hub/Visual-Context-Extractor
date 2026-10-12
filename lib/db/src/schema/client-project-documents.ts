import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { clientProjects } from "./client-projects";

export const clientProjectDocuments = pgTable(
  "client_project_documents",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => clientProjects.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    objectPath: text("object_path").notNull().unique(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    extractedText: text("extracted_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("client_project_documents_project_id_idx").on(table.projectId)],
);

export const insertClientProjectDocumentSchema = createInsertSchema(
  clientProjectDocuments,
).omit({
  id: true,
  createdAt: true,
});

export type InsertClientProjectDocument = z.infer<
  typeof insertClientProjectDocumentSchema
>;
export type ClientProjectDocument = typeof clientProjectDocuments.$inferSelect;
