import { randomUUID } from "node:crypto";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR = "http://127.0.0.1:1106";

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function privateDirectory(): string {
  const directory = process.env.PRIVATE_OBJECT_DIR;
  if (!directory) throw new Error("Private file storage is not configured.");
  return directory.replace(/^\/+|\/+$/g, "");
}

function fileForObjectPath(objectPath: string, projectId: number): File {
  const expectedPrefix = `/objects/project-documents/${projectId}/`;
  if (!objectPath.startsWith(expectedPrefix) || objectPath.includes("..")) {
    throw new Error("Document path does not belong to this project.");
  }
  const relativePath = objectPath.slice("/objects/".length);
  const [bucketName, ...objectParts] = `${privateDirectory()}/${relativePath}`.split("/");
  const objectName = objectParts.join("/");
  if (!bucketName || !objectName) throw new Error("Invalid private document path.");
  return storage.bucket(bucketName).file(objectName);
}

async function signUploadUrl(bucketName: string, objectName: string): Promise<string> {
  const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Could not create a private upload URL (${response.status}).`);
  }
  const result = (await response.json()) as { signed_url?: string };
  if (!result.signed_url) throw new Error("Storage returned an invalid upload URL.");
  return result.signed_url;
}

export async function createProjectDocumentUpload(
  projectId: number,
  extension: string,
): Promise<{ uploadURL: string; objectPath: string }> {
  const objectPath = `/objects/project-documents/${projectId}/${randomUUID()}.${extension}`;
  const [bucketName, ...objectParts] =
    `${privateDirectory()}/${objectPath.slice("/objects/".length)}`.split("/");
  const objectName = objectParts.join("/");
  if (!bucketName || !objectName) throw new Error("Invalid private document path.");
  return {
    uploadURL: await signUploadUrl(bucketName, objectName),
    objectPath,
  };
}

export async function getProjectDocumentFile(
  objectPath: string,
  projectId: number,
): Promise<File> {
  const file = fileForObjectPath(objectPath, projectId);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Uploaded file was not found in private storage.");
  return file;
}

export async function deleteProjectDocumentFile(
  objectPath: string,
  projectId: number,
): Promise<void> {
  const file = fileForObjectPath(objectPath, projectId);
  await file.delete({ ignoreNotFound: true });
}
