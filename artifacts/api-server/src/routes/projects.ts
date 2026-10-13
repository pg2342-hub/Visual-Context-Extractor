import { Router, type IRouter, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  CreateProjectBody,
  CreateProjectConnectionBody,
  CreateProjectConnectionParams,
  CreateProjectDocumentBody,
  DeleteProjectConnectionParams,
  DeleteProjectDocumentParams,
  ListProjectConnectionsParams,
  RequestProjectDocumentUploadUrlBody,
  RequestProjectDocumentUploadUrlParams,
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
import {
  extractProjectDocumentText,
  getSupportedExtension,
  isAllowedDocumentMimeType,
  MAX_PROJECT_DOCUMENT_BYTES,
  MAX_PROJECT_DOCUMENTS,
} from "../lib/projectDocumentText";
import { encryptProjectCredential } from "../lib/projectConnectionSecrets";

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

function cleanFileName(fileName: string): string {
  return fileName.trim().replace(/\\/g, "/").split("/").pop() ?? "";
}

function validateDocumentMetadata(
  fileName: string,
  sizeBytes: number,
  contentType: string,
  res: Response,
): string | null {
  if (sizeBytes > MAX_PROJECT_DOCUMENT_BYTES) {
    res.status(413).json({
      error: "Document is too large.",
      details: "Each project document must be 10 MB or smaller.",
    });
    return null;
  }
  const extension = getSupportedExtension(fileName);
  if (!extension || !isAllowedDocumentMimeType(extension, contentType)) {
    res.status(400).json({
      error: "Unsupported document type.",
      details: "Upload a PDF, DOCX, TXT, Markdown, CSV, JSON, or YAML file.",
    });
    return null;
  }
  return extension;
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

router.get("/projects/:id/documents", async (req, res, next) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId < 1) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(projectId, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const documents = await db
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
      .orderBy(desc(clientProjectDocuments.createdAt));
    res.json({ documents });
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/documents/upload-url", async (req, res, next) => {
  const params = RequestProjectDocumentUploadUrlParams.safeParse(req.params);
  const parsed = RequestProjectDocumentUploadUrlBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid document upload request." });
    return;
  }
  const fileName = cleanFileName(parsed.data.fileName);
  const extension = validateDocumentMetadata(
    fileName,
    parsed.data.sizeBytes,
    parsed.data.contentType,
    res,
  );
  if (!extension) return;

  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const existing = await db
      .select({ id: clientProjectDocuments.id })
      .from(clientProjectDocuments)
      .where(eq(clientProjectDocuments.projectId, params.data.id))
      .limit(MAX_PROJECT_DOCUMENTS);
    if (existing.length >= MAX_PROJECT_DOCUMENTS) {
      res.status(400).json({
        error: "Project document limit reached.",
        details: `A project can have at most ${MAX_PROJECT_DOCUMENTS} reference documents.`,
      });
      return;
    }

    res.json(await createProjectDocumentUpload(params.data.id, extension));
  } catch (error) {
    next(error);
  }
});

router.post("/projects/:id/documents", async (req, res, next) => {
  const params = RequestProjectDocumentUploadUrlParams.safeParse(req.params);
  const parsed = CreateProjectDocumentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: "Invalid document registration request." });
    return;
  }
  const fileName = cleanFileName(parsed.data.fileName);
  const extension = validateDocumentMetadata(
    fileName,
    parsed.data.sizeBytes,
    parsed.data.contentType,
    res,
  );
  if (!extension) return;

  try {
    const projectId = params.data.id;
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(projectId, ownerId))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    const existing = await db
      .select({ id: clientProjectDocuments.id })
      .from(clientProjectDocuments)
      .where(eq(clientProjectDocuments.projectId, projectId))
      .limit(MAX_PROJECT_DOCUMENTS);
    if (existing.length >= MAX_PROJECT_DOCUMENTS) {
      res.status(400).json({
        error: "Project document limit reached.",
        details: `A project can have at most ${MAX_PROJECT_DOCUMENTS} reference documents.`,
      });
      return;
    }

    const expectedPrefix = `/objects/project-documents/${projectId}/`;
    const expectedSuffix = new RegExp(
      `^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[0-9a-f-]{36}\\.${extension}$`,
      "i",
    );
    if (!expectedSuffix.test(parsed.data.objectPath)) {
      res.status(400).json({
        error: "Invalid document upload.",
        details: "The uploaded file does not belong to this project.",
      });
      return;
    }

    const file = await getProjectDocumentFile(parsed.data.objectPath, projectId);
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) !== parsed.data.sizeBytes) {
      await deleteProjectDocumentFile(parsed.data.objectPath, projectId);
      res.status(400).json({
        error: "Uploaded document size does not match.",
        details: "Please upload the document again.",
      });
      return;
    }

    let extractedText: string;
    try {
      const [bytes] = await file.download();
      extractedText = await extractProjectDocumentText(bytes, extension);
    } catch (error) {
      await deleteProjectDocumentFile(parsed.data.objectPath, projectId).catch(
        (storageError: unknown) =>
          req.log.warn({ err: storageError }, "Could not remove rejected project document"),
      );
      res.status(400).json({
        error: "Could not read this document.",
        details: error instanceof Error ? error.message : "The file could not be processed.",
      });
      return;
    }

    const [document] = await db
      .insert(clientProjectDocuments)
      .values({
        projectId,
        originalName: fileName,
        objectPath: parsed.data.objectPath,
        mimeType: parsed.data.contentType,
        sizeBytes: parsed.data.sizeBytes,
        extractedText,
      })
      .returning({
        id: clientProjectDocuments.id,
        projectId: clientProjectDocuments.projectId,
        originalName: clientProjectDocuments.originalName,
        mimeType: clientProjectDocuments.mimeType,
        sizeBytes: clientProjectDocuments.sizeBytes,
        createdAt: clientProjectDocuments.createdAt,
      });
    res.status(201).json(document);
  } catch (error) {
    next(error);
  }
});

router.delete("/projects/:id/documents/:documentId", async (req, res, next) => {
  const params = DeleteProjectDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(404).json({ error: "Project document not found." });
    return;
  }
  try {
    const ownerId = getAuth(req).userId!;
    if (!(await getOwnedProject(params.data.id, ownerId))) {
      res.status(404).json({ error: "Project document not found." });
      return;
    }
    const [document] = await db
      .select({
        id: clientProjectDocuments.id,
        objectPath: clientProjectDocuments.objectPath,
      })
      .from(clientProjectDocuments)
      .where(
        and(
          eq(clientProjectDocuments.id, params.data.documentId),
          eq(clientProjectDocuments.projectId, params.data.id),
        ),
      )
      .limit(1);
    if (!document) {
      res.status(404).json({ error: "Project document not found." });
      return;
    }
    await deleteProjectDocumentFile(document.objectPath, params.data.id);
    await db
      .delete(clientProjectDocuments)
      .where(eq(clientProjectDocuments.id, document.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

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
