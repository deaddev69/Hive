// convex/lib/uploads.ts
// Secure file upload validation helper.

import { MutationCtx, QueryCtx } from "../_generated/server";

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

/**
 * Validates file size, MIME type, and asserts that the file extension matches the MIME type.
 * Throws an error on mismatch or size bounds breaches.
 */
export async function validateUploadedFile(
  ctx: { storage: any },
  storageId: any,
  filename: string | undefined,
  allowedMimeTypes: string[],
  maxSizeBytes: number
) {
  if (typeof storageId === "object" || (typeof storageId === "string" && storageId.startsWith("http"))) {
    return;
  }

  const metadata = await ctx.storage.getMetadata(storageId);
  if (!metadata) {
    throw new Error(`File not found for storage ID: ${storageId}`);
  }

  // 1. Verify file size bounds
  if (metadata.size > maxSizeBytes) {
    throw new Error(`File size ${metadata.size} exceeds maximum limit of ${maxSizeBytes} bytes.`);
  }

  // 2. Verify MIME type
  if (!metadata.contentType || !allowedMimeTypes.includes(metadata.contentType)) {
    throw new Error(`Invalid file type: ${metadata.contentType || "unknown"}. Allowed types: ${allowedMimeTypes.join(", ")}.`);
  }

  // 3. Verify file extension matches MIME type
  if (filename) {
    const allowedExts = MIME_TO_EXTENSIONS[metadata.contentType];
    if (allowedExts) {
      const parts = filename.split(".");
      // Extract the final extension (e.g. "exe" in "invoice.pdf.exe")
      const lastPart = parts[parts.length - 1];
      const ext = parts.length > 1 && lastPart ? `.${lastPart.toLowerCase()}` : "";
      if (!allowedExts.includes(ext)) {
        throw new Error(`Security Exception: File extension "${ext}" does not match detected MIME type "${metadata.contentType}".`);
      }
    }
  }
}
