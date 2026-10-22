import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import express from "express";
import { test } from "node:test";
import { buildProjectDocumentContext } from "../lib/projectDocumentText";
import {
  createProjectDocumentRouter,
  type NewProjectDocument,
  type ProjectDocumentRouteDependencies,
  type PublicProjectDocument,
} from "./projectDocumentRoutes";

const validObjectPath =
  "/objects/project-documents/1/123e4567-e89b-12d3-a456-426614174000.txt";
const otherProjectObjectPath =
  "/objects/project-documents/2/123e4567-e89b-12d3-a456-426614174000.txt";

function createFixture() {
  const publicDocuments: PublicProjectDocument[] = [
    {
      id: 10,
      projectId: 1,
      originalName: "architecture.txt",
      mimeType: "text/plain",
      sizeBytes: 4,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    },
    {
      id: 20,
      projectId: 2,
      originalName: "other-client.txt",
      mimeType: "text/plain",
      sizeBytes: 5,
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  ];
  const documentPaths = new Map<number, string>([
    [10, validObjectPath],
    [20, otherProjectObjectPath],
  ]);
  const events: string[] = [];
  let insertedDocument: NewProjectDocument | undefined;
  const dependencies: ProjectDocumentRouteDependencies = {
    getUserId: (req) => req.header("x-user-id"),
    ownsProject: async (projectId, userId) =>
      (projectId === 1 && userId === "alice") ||
      (projectId === 2 && userId === "bob"),
    listDocuments: async (projectId) =>
      publicDocuments.filter((document) => document.projectId === projectId),
    countDocuments: async () => 0,
    createUpload: async (projectId, extension) => {
      events.push(`createUpload:${projectId}:${extension}`);
      return {
        uploadURL: "https://storage.example/signed-upload",
        objectPath: `/objects/project-documents/${projectId}/new.${extension}`,
      };
    },
    getFile: async (objectPath, projectId) => {
      events.push(`getFile:${projectId}:${objectPath}`);
      return {
        getMetadata: async () => [{ size: "4" }],
        download: async () => [Buffer.from("private client notes")],
      };
    },
    deleteFile: async (objectPath, projectId) => {
      events.push(`deleteFile:${projectId}:${objectPath}`);
    },
    extractText: async (bytes, extension) => {
      events.push(`extractText:${extension}`);
      return bytes.toString("utf8").toUpperCase();
    },
    registerDocument: async (document) => {
      insertedDocument = document;
      events.push(`register:${document.projectId}`);
      const created = {
        id: 30,
        projectId: document.projectId,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      };
      publicDocuments.push(created);
      documentPaths.set(created.id, document.objectPath);
      return created;
    },
    findDocument: async (projectId, documentId) => {
      const document = publicDocuments.find(
        (candidate) =>
          candidate.id === documentId && candidate.projectId === projectId,
      );
      return document
        ? { id: document.id, objectPath: documentPaths.get(document.id)! }
        : null;
    },
    deleteDocument: async (documentId) => {
      events.push(`deleteDocument:${documentId}`);
    },
  };

  return { dependencies, events, publicDocuments, getInsertedDocument: () => insertedDocument };
}

async function startServer(dependencies: ProjectDocumentRouteDependencies) {
  const app = express();
  app.use(express.json());
  app.use(createProjectDocumentRouter(dependencies));
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;

  return {
    server,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

function documentBody(overrides: Record<string, unknown> = {}) {
  return {
    fileName: "architecture.txt",
    sizeBytes: 4,
    contentType: "text/plain",
    objectPath: validObjectPath,
    ...overrides,
  };
}

async function send(
  baseUrl: string,
  path: string,
  options: { method?: string; userId?: string; body?: unknown } = {},
) {
  return fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.userId ? { "x-user-id": options.userId } : {}),
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

test("project document endpoints require authentication", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const requests = [
      send(server.url, "/projects/1/documents"),
      send(server.url, "/projects/1/documents/upload-url", {
        method: "POST",
        body: { fileName: "architecture.txt", sizeBytes: 4, contentType: "text/plain" },
      }),
      send(server.url, "/projects/1/documents", {
        method: "POST",
        body: documentBody(),
      }),
      send(server.url, "/projects/1/documents/10", { method: "DELETE" }),
    ];
    const responses = await Promise.all(requests);
    assert.deepEqual(
      responses.map((response) => response.status),
      [401, 401, 401, 401],
    );
    assert.deepEqual(fixture.events, []);
  } finally {
    await server.close();
  }
});

test("upload URL and document listing are limited to the signed-in project's owner", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const signedUpload = await send(server.url, "/projects/1/documents/upload-url", {
      method: "POST",
      userId: "alice",
      body: { fileName: "architecture.txt", sizeBytes: 4, contentType: "text/plain" },
    });
    assert.equal(signedUpload.status, 200);
    const signedUploadBody = (await signedUpload.json()) as { objectPath: string };
    assert.equal(signedUploadBody.objectPath, "/objects/project-documents/1/new.txt");

    const ownDocuments = await send(server.url, "/projects/1/documents", {
      userId: "alice",
    });
    assert.equal(ownDocuments.status, 200);
    const ownDocumentsBody = (await ownDocuments.json()) as {
      documents: PublicProjectDocument[];
    };
    assert.deepEqual(
      ownDocumentsBody.documents.map((document) => document.originalName),
      ["architecture.txt"],
    );

    const otherOwnerUploadUrl = await send(
      server.url,
      "/projects/1/documents/upload-url",
      {
        method: "POST",
        userId: "bob",
        body: {
          fileName: "private.txt",
          sizeBytes: 4,
          contentType: "text/plain",
        },
      },
    );
    assert.equal(otherOwnerUploadUrl.status, 404);

    const otherOwnerDocuments = await send(server.url, "/projects/1/documents", {
      userId: "bob",
    });
    assert.equal(otherOwnerDocuments.status, 404);
    assert.deepEqual(fixture.events, ["createUpload:1:txt"]);
  } finally {
    await server.close();
  }
});

test("registration extracts and stores text for the analysis context", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const response = await send(server.url, "/projects/1/documents", {
      method: "POST",
      userId: "alice",
      body: documentBody(),
    });
    assert.equal(response.status, 201);
    assert.equal(fixture.getInsertedDocument()?.extractedText, "PRIVATE CLIENT NOTES");
    assert.deepEqual(fixture.events, [
      `getFile:1:${validObjectPath}`,
      "extractText:txt",
      "register:1",
    ]);

    const analysisContext = buildProjectDocumentContext([
      {
        id: 30,
        originalName: fixture.getInsertedDocument()!.originalName,
        extractedText: fixture.getInsertedDocument()!.extractedText,
      },
    ]);
    assert.equal(
      analysisContext,
      'DOC-30 — "architecture.txt"\nPRIVATE CLIENT NOTES',
    );
  } finally {
    await server.close();
  }
});

test("a document path from a different project cannot be registered", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const response = await send(server.url, "/projects/1/documents", {
      method: "POST",
      userId: "alice",
      body: documentBody({ objectPath: otherProjectObjectPath }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(fixture.events, []);
    assert.equal(fixture.getInsertedDocument(), undefined);
  } finally {
    await server.close();
  }
});

test("users cannot list or remove another owner's project document", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const listResponse = await send(server.url, "/projects/1/documents", {
      userId: "bob",
    });
    const deleteResponse = await send(server.url, "/projects/1/documents/10", {
      method: "DELETE",
      userId: "bob",
    });
    assert.equal(listResponse.status, 404);
    assert.equal(deleteResponse.status, 404);
    assert.deepEqual(fixture.events, []);
  } finally {
    await server.close();
  }
});

test("a document ID from another project cannot be removed, while the owned document can", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const wrongProjectResponse = await send(
      server.url,
      "/projects/1/documents/20",
      { method: "DELETE", userId: "alice" },
    );
    assert.equal(wrongProjectResponse.status, 404);
    assert.deepEqual(fixture.events, []);

    const deleteResponse = await send(server.url, "/projects/1/documents/10", {
      method: "DELETE",
      userId: "alice",
    });
    assert.equal(deleteResponse.status, 204);
    assert.deepEqual(fixture.events, [
      `deleteFile:1:${validObjectPath}`,
      "deleteDocument:10",
    ]);
  } finally {
    await server.close();
  }
});

test("oversized and unsupported documents are rejected before storage access", async () => {
  const fixture = createFixture();
  const server = await startServer(fixture.dependencies);
  try {
    const oversized = await send(
      server.url,
      "/projects/1/documents/upload-url",
      {
        method: "POST",
        userId: "alice",
        body: {
          fileName: "too-large.txt",
          sizeBytes: 10 * 1024 * 1024 + 1,
          contentType: "text/plain",
        },
      },
    );
    assert.equal(oversized.status, 400);

    const unsupported = await send(server.url, "/projects/1/documents", {
      method: "POST",
      userId: "alice",
      body: documentBody({
        fileName: "diagram.exe",
        contentType: "application/octet-stream",
      }),
    });
    assert.equal(unsupported.status, 400);
    assert.deepEqual(fixture.events, []);
    assert.equal(fixture.getInsertedDocument(), undefined);
  } finally {
    await server.close();
  }
});
