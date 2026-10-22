import { Router, type Request, type Response } from "express";
import {
  CreateProjectDocumentBody,
  DeleteProjectDocumentParams,
  RequestProjectDocumentUploadUrlBody,
  RequestProjectDocumentUploadUrlParams,
} from "@workspace/api-zod";
import {
  MAX_PROJECT_DOCUMENT_BYTES,
  MAX_PROJECT_DOCUMENTS,
  extractProjectDocumentText,
  getSupportedExtension,
  isAllowedDocumentMimeType,
} from "../lib/projectDocumentText";
import {
  createProjectDocumentUpload,
  deleteProjectDocumentFile,
  getProjectDocumentFile,
} from "../lib/projectDocumentStorage";

export type PublicProjectDocument = {
  id: number;
  projectId: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

export type NewProjectDocument = {
  projectId: number;
  originalName: string;
  objectPath: string;
  mimeType: string;
  sizeBytes: number;
  extractedText: string;
};

type StoredDocumentFile = {
  getMetadata(): Promise<[{ size?: string | number }, ...unknown[]]>;
  download(): Promise<[Buffer, ...unknown[]]>;
};

export type ProjectDocumentRouteDependencies = {
  getUserId: (req: Request) => string | null | undefined;
  ownsProject: (projectId: number, ownerId: string) => Promise<boolean>;
  listDocuments: (projectId: number) => Promise<PublicProjectDocument[]>;
  countDocuments: (projectId: number) => Promise<number>;
  createUpload: (projectId: number, extension: string) => Promise<{
    uploadURL: string;
    objectPath: string;
  }>;
  getFile: (objectPath: string, projectId: number) => Promise<StoredDocumentFile>;
  deleteFile: (objectPath: string, projectId: number) => Promise<void>;
  extractText: (bytes: Buffer, extension: string) => Promise<string>;
  registerDocument: (document: NewProjectDocument) => Promise<PublicProjectDocument>;
  findDocument: (
    projectId: number,
    documentId: number,
  ) => Promise<{ id: number; objectPath: string } | null>;
  deleteDocument: (documentId: number) => Promise<void>;
  warn?: (error: unknown) => void;
};

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

export function createProjectDocumentRouter(
  dependencies: ProjectDocumentRouteDependencies,
) {
  const router = Router();
  router.use("/projects", (req, res, next) => {
    if (!dependencies.getUserId(req)) {
      res.status(401).json({ error: "Sign in is required to access client projects." });
      return;
    }
    next();
  });

  router.get("/projects/:id/documents", async (req, res, next) => {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId < 1) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    try {
      const ownerId = dependencies.getUserId(req)!;
      if (!(await dependencies.ownsProject(projectId, ownerId))) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      res.json({ documents: await dependencies.listDocuments(projectId) });
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
      const projectId = params.data.id;
      const ownerId = dependencies.getUserId(req)!;
      if (!(await dependencies.ownsProject(projectId, ownerId))) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      if ((await dependencies.countDocuments(projectId)) >= MAX_PROJECT_DOCUMENTS) {
        res.status(400).json({
          error: "Project document limit reached.",
          details: `A project can have at most ${MAX_PROJECT_DOCUMENTS} reference documents.`,
        });
        return;
      }
      res.json(await dependencies.createUpload(projectId, extension));
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
      const ownerId = dependencies.getUserId(req)!;
      if (!(await dependencies.ownsProject(projectId, ownerId))) {
        res.status(404).json({ error: "Project not found." });
        return;
      }
      if ((await dependencies.countDocuments(projectId)) >= MAX_PROJECT_DOCUMENTS) {
        res.status(400).json({
          error: "Project document limit reached.",
          details: `A project can have at most ${MAX_PROJECT_DOCUMENTS} reference documents.`,
        });
        return;
      }

      const expectedPrefix = `/objects/project-documents/${projectId}/`;
      const expectedPath = new RegExp(
        `^${expectedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[0-9a-f-]{36}\\.${extension}$`,
        "i",
      );
      if (!expectedPath.test(parsed.data.objectPath)) {
        res.status(400).json({
          error: "Invalid document upload.",
          details: "The uploaded file does not belong to this project.",
        });
        return;
      }

      const file = await dependencies.getFile(parsed.data.objectPath, projectId);
      const [metadata] = await file.getMetadata();
      if (Number(metadata.size) !== parsed.data.sizeBytes) {
        await dependencies.deleteFile(parsed.data.objectPath, projectId);
        res.status(400).json({
          error: "Uploaded document size does not match.",
          details: "Please upload the document again.",
        });
        return;
      }

      let extractedText: string;
      try {
        const [bytes] = await file.download();
        extractedText = await dependencies.extractText(bytes, extension);
      } catch (error) {
        await dependencies.deleteFile(parsed.data.objectPath, projectId).catch(
          (storageError: unknown) => dependencies.warn?.(storageError),
        );
        res.status(400).json({
          error: "Could not read this document.",
          details: error instanceof Error ? error.message : "The file could not be processed.",
        });
        return;
      }

      const document = await dependencies.registerDocument({
        projectId,
        originalName: fileName,
        objectPath: parsed.data.objectPath,
        mimeType: parsed.data.contentType,
        sizeBytes: parsed.data.sizeBytes,
        extractedText,
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
      const ownerId = dependencies.getUserId(req)!;
      if (!(await dependencies.ownsProject(params.data.id, ownerId))) {
        res.status(404).json({ error: "Project document not found." });
        return;
      }
      const document = await dependencies.findDocument(
        params.data.id,
        params.data.documentId,
      );
      if (!document) {
        res.status(404).json({ error: "Project document not found." });
        return;
      }
      await dependencies.deleteFile(document.objectPath, params.data.id);
      await dependencies.deleteDocument(document.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

