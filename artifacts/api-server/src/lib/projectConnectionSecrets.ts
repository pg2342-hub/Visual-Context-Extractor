import { createCipheriv, createHash, randomBytes } from "node:crypto";

const SECRET_CONTEXT = "client-project-connections:v1";

export function encryptProjectCredential(
  projectId: number,
  provider: string,
  credential: string,
): string {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required to encrypt project credentials.");
  }

  const key = createHash("sha256")
    .update(sessionSecret)
    .update("\0")
    .update(SECRET_CONTEXT)
    .digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`${projectId}:${provider}:${SECRET_CONTEXT}`));
  const encrypted = Buffer.concat([
    cipher.update(credential, "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}
