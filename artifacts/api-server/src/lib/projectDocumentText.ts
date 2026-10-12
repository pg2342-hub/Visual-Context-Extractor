import { extractRawText } from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_PROJECT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_PROJECT_DOCUMENTS = 20;
export const MAX_EXTRACTED_DOCUMENT_CHARS = 100_000;
export const MAX_ANALYSIS_DOCUMENT_CONTEXT_CHARS = 40_000;

const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  pdf: ["application/pdf", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
  txt: ["text/plain", "application/octet-stream"],
  md: ["text/markdown", "text/plain", "application/octet-stream"],
  markdown: ["text/markdown", "text/plain", "application/octet-stream"],
  csv: ["text/csv", "application/csv", "text/plain", "application/octet-stream"],
  json: ["application/json", "text/json", "text/plain", "application/octet-stream"],
  yaml: ["application/yaml", "text/yaml", "text/x-yaml", "text/plain", "application/octet-stream"],
  yml: ["application/yaml", "text/yaml", "text/x-yaml", "text/plain", "application/octet-stream"],
};

export function getSupportedExtension(fileName: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const extension = match?.[1]?.toLowerCase();
  return extension && extension in MIME_TYPES_BY_EXTENSION ? extension : null;
}

export function isAllowedDocumentMimeType(extension: string, mimeType: string): boolean {
  return MIME_TYPES_BY_EXTENSION[extension]?.includes(mimeType.toLowerCase()) ?? false;
}

export async function extractProjectDocumentText(
  bytes: Buffer,
  extension: string,
): Promise<string> {
  let text: string;
  if (extension === "pdf") {
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("The file contents are not a valid PDF.");
    }
    const parser = new PDFParse({ data: bytes });
    try {
      text = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } else if (extension === "docx") {
    if (bytes.subarray(0, 2).toString("ascii") !== "PK") {
      throw new Error("The file contents are not a valid DOCX document.");
    }
    text = (await extractRawText({ buffer: bytes })).value;
  } else {
    text = bytes.toString("utf8");
    if (text.includes("\u0000") || text.includes("\uFFFD")) {
      throw new Error("The file does not contain readable UTF-8 text.");
    }
  }

  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) {
    throw new Error(
      extension === "pdf"
        ? "No selectable text was found. Scanned PDFs are not supported yet."
        : "No readable text was found in the document.",
    );
  }
  return normalized.slice(0, MAX_EXTRACTED_DOCUMENT_CHARS);
}
