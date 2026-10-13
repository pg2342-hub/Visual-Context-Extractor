import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { clientProjects } from "./client-projects";

export const clientProjectConnections = pgTable(
  "client_project_connections",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
      .notNull()
      .references(() => clientProjects.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    credentialCiphertext: text("credential_ciphertext").notNull(),
    metadata: text("metadata").notNull().default(""),
    includeInAnalysis: boolean("include_in_analysis").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("client_project_connections_project_id_idx").on(table.projectId),
  ],
);

export const insertClientProjectConnectionSchema = createInsertSchema(
  clientProjectConnections,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertClientProjectConnection = z.infer<
  typeof insertClientProjectConnectionSchema
>;
export type ClientProjectConnection =
  typeof clientProjectConnections.$inferSelect;
