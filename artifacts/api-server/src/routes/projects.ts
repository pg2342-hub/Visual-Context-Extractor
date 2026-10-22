import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateProjectBody,
  CreateProjectConnectionBody,
  CreateProjectConnectionParams,
  DeleteProjectConnectionParams,
  ListProjectConnectionsParams,
  UpdateProjectConnectionBody,
  UpdateProjectConnectionParams,
  UpdateProjectBody,
} from "@workspace/api-zod";
import {
  clientProjectConnections,
  clientProjectDocuments,
  clientProjects,
  db,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/require-auth";
import {
  createProjectDocumentUpload,
  deleteProjectDocumentFile,
  getProjectDocumentFile,
} from "../lib/projectDocumentStorage";
import { extractProjectDocumentText, MAX_PROJECT_DOCUMENTS } from "../lib/projectDocumentText";
import { encryptProjectCredential } from "../lib/projectConnectionSecrets";
import { createProjectDocumentRouter } from "./projectDocumentRoutes";
import { logger } from "../logger";

const router: IRouter = Router();

router.use("/projects", requireAuth);

async function getOwnedProject(projectId: number, ownerId: string) {
  const [project] = await db
    .select({ id: clientProjects.id })
    .from(clientProjects)
    .where(and(eq(clientProjects.id, projectId), eq(clientProjects.ownerId, ownerId)))
    .limit(1);
  return project;
}

router.get("/projects", async (req, res, next) => {
  try {
    const ownerId = getAuth(req).userId!;
    const projects = await db
      .select({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      })
      .from(clientProjects)
      .where(eq(clientProjects.ownerId, ownerId))
      .orderBy(desc(clientProjects.updatedAt));

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

router.use(
  createProjectDocumentRouter({
    getUserId: (req) => getAuth(req).userId,
    ownsProject: async (projectId, ownerId) =>
      Boolean(await getOwnedProject(projectId, ownerId)),
    listDocuments: async (projectId) =>
      db
        .select({
          id: clientProjectDocuments.id,
          projectId: clientProjectDocuments.projectId,
          originalName: clientProjectDocuments.originalName,
          mimeType: clientProjectDocuments.mimeType,
          sizeBytes: clientProjectDocuments.sizeBytes,
          createdAt: clientProjectDocuments.createdAt,
        })
        .from(clientProjectDocuments)
        .where(eq(clientProjectDocuments.projectId, projectId))
        .orderBy(desc(clientProjectDocuments.createdAt)),
    countDocuments: async (projectId) =>
      (
        await db
          .select({ id: clientProjectDocuments.id })
          .from(clientProjectDocuments)
          .where(eq(clientProjectDocuments.projectId, projectId))
          .limit(MAX_PROJECT_DOCUMENTS)
      ).length,
    createUpload: createProjectDocumentUpload,
    getFile: getProjectDocumentFile,
    deleteFile: deleteProjectDocumentFile,
    extractText: extractProjectDocumentText,
    registerDocument: async (document) => {
      const [created] = await db
        .insert(clientProjectDocuments)
        .values(document)
        .returning({
          id: clientProjectDocuments.id,
          projectId: clientProjectDocuments.projectId,
          originalName: clientProjectDocuments.originalName,
          mimeType: clientProjectDocuments.mimeType,
          sizeBytes: clientProjectDocuments.sizeBytes,
          createdAt: clientProjectDocuments.createdAt,
        });
      if (!created) throw new Error("Project document registration failed.");
      return created;
    },
    findDocument: async (projectId, documentId) => {
      const [document] = await db
        .select({
          id: clientProjectDocuments.id,
          objectPath: clientProjectDocuments.objectPath,
        })
        .from(clientProjectDocuments)
        .where(
          and(
            eq(clientProjectDocuments.id, documentId),
            eq(clientProjectDocuments.projectId, projectId),
          ),
        )
        .limit(1);
      return document ?? null;
    },
    deleteDocument: async (documentId) => {
      await db
        .delete(clientProjectDocuments)
        .where(eq(clientProjectDocuments.id, documentId));
    },
    warn: (error) =>
      logger.warn({ err: error }, "Could not remove rejected project document"),
  }),
);

router.get("/projects/:id/connections", async (req, res, next) => {
  const params = ListProjectConnectionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const connections = await db
      .select({
        id: clientProjectConnections.id,
        projectId: clientProjectConnections.projectId,
        provider: clientProjectConnections.provider,
        displayName: clientProjectConnections.displayName,
        metadata: clientProjectConnections.metadata,
        includeInAnalysis: clientProjectConnections.includeInAnalysis,
        createdAt: clientProjectConnections.createdAt,
        updatedAt: clientProjectConnections.updatedAt,
      })
      .from(clientProjectConnections)
      .where(eq(clientProjectConnections.projectId, params.data.id))
      .orderBy(desc(clientProjectConnections.updatedAt));
    res.json({ connections });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/connections", async (req, res, next) => {
  const params = CreateProjectConnectionParams.safeParse(req.params);
  const parsed = CreateProjectConnectionBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid project connection." });
    return;
  }
  const displayName = parsed.data.displayName.trim();
  const credential = parsed.data.credentials.trim();
  if (!displayName || !credential) {
    res.status(400).json({
      error: "A connection name and credential are required.",
    });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    let credentialCiphertext: string;
    try {
      credentialCiphertext = encryptProjectCredential(
        params.data.id,
        parsed.data.provider,
        credential,
      );
    } catch (error) {
      req.log.error({ err: error }, "Could not encrypt a project connection credential");
      res.status(503).json({
        error: "Secure credential storage is not available.",
      });
      return;
    }

    const [connection] = await db
      .insert(clientProjectConnections)
      .values({
        projectId: params.data.id,
        provider: parsed.data.provider,
        displayName,
        credentialCiphertext,
        metadata: parsed.data.metadata ?? "",
        includeInAnalysis: parsed.data.includeInAnalysis ?? false,
      })
      .returning({
        id: clientProjectConnections.id,
        projectId: clientProjectConnections.projectId,
        provider: clientProjectConnections.provider,
        displayName: clientProjectConnections.displayName,
        metadata: clientProjectConnections.metadata,
        includeInAnalysis: clientProjectConnections.includeInAnalysis,
        createdAt: clientProjectConnections.createdAt,
        updatedAt: clientProjectConnections.updatedAt,
      });
    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/projects/:id/connections/:connectionId",
  async (req, res, next) => {
    const params = UpdateProjectConnectionParams.safeParse(req.params);
    const parsed = UpdateProjectConnectionBody.safeParse(req.body);
    if (!params.success || !parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      res.status(400).json({ error: "Invalid project connection update." });
      return;
    }
    if (
      parsed.data.displayName !== undefined &&
      !parsed.data.displayName.trim()
    ) {
      res.status(400).json({ error: "Connection name cannot be empty." });
      return;
    }

    try {
      const ownerId = getAuth(req).userId!;
      if (!(await getOwnedProject(params.data.id, ownerId))) {
        res.status(404).json({ error: "Project connection not found." });
        return;
      }
      const [connection] = await db
        .update(clientProjectConnections)
        .set({
          ...parsed.data,
          ...(parsed.data.displayName !== undefined
            ? { displayName: parsed.data.displayName.trim() }
            : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clientProjectConnections.id, params.data.connectionId),
            eq(clientProjectConnections.projectId, params.data.id),
          ),
        )
        .returning({
          id: clientProjectConnections.id,
          projectId: clientProjectConnections.projectId,
          provider: clientProjectConnections.provider,
          displayName: clientProjectConnections.displayName,
          metadata: clientProjectConnections.metadata,
          includeInAnalysis: clientProjectConnections.includeInAnalysis,
          createdAt: clientProjectConnections.createdAt,
          updatedAt: clientProjectConnections.updatedAt,
        });
      if (!connection) {
        res.status(404).json({ error: "Project connection not found." });
        return;
      }
      res.json(connection);
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/projects/:id/connections/:connectionId",
  async (req, res, next) => {
    const params = DeleteProjectConnectionParams.safeParse(req.params);
    if (!params.success) {
      res.status(404).json({ error: "Project connection not found." });
      return;
    }
    try {
      const ownerId = getAuth(req).userId!;
      if (!(await getOwnedProject(params.data.id, ownerId))) {
        res.status(404).json({ error: "Project connection not found." });
        return;
      }
      const deleted = await db
        .delete(clientProjectConnections)
        .where(
          and(
            eq(clientProjectConnections.id, params.data.connectionId),
            eq(clientProjectConnections.projectId, params.data.id),
          ),
        )
        .returning({ id: clientProjectConnections.id });
      if (deleted.length === 0) {
        res.status(404).json({ error: "Project connection not found." });
        return;
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },
);

router.post("/projects", async (req, res, next) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid project", details: parsed.error.message });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const [project] = await db
      .insert(clientProjects)
      .values({
        ownerId,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() ?? "",
      })
      .returning({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

router.get("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const [project] = await db
      .select({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      })
      .from(clientProjects)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.patch("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({
      error: "Invalid project update.",
      details: parsed.success ? "Provide at least one field to update." : parsed.error.message,
    });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    const update = {
      ...parsed.data,
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description.trim() }
        : {}),
      updatedAt: new Date(),
    };
    const [project] = await db
      .update(clientProjects)
      .set(update)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .returning({
        id: clientProjects.id,
        name: clientProjects.name,
        description: clientProjects.description,
        knowledge: clientProjects.knowledge,
        createdAt: clientProjects.createdAt,
        updatedAt: clientProjects.updatedAt,
      });

    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.delete("/projects/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const documents = await db
      .select({
        projectId: clientProjectDocuments.projectId,
        objectPath: clientProjectDocuments.objectPath,
      })
      .from(clientProjectDocuments)
      .where(eq(clientProjectDocuments.projectId, id));
    await Promise.all(
      documents.map((document) =>
        deleteProjectDocumentFile(document.objectPath, document.projectId),
      ),
    );
    const deleted = await db
      .delete(clientProjects)
      .where(and(eq(clientProjects.id, id), eq(clientProjects.ownerId, ownerId)))
      .returning({ id: clientProjects.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
