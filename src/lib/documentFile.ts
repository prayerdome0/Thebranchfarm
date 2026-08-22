"use client";

import { uploadGenericFileToCloudinary } from "@/lib/cloudinary";
import { renderPrintableDocument, type PrintableDocumentInput } from "@/lib/server/printable";

export interface GeneratedDocumentFile {
  fileUrl: string;
  publicId: string;
}

/**
 * Renders the printable document and stores it in the farm's secure media
 * storage (via the authenticated /api/uploads proxy — the browser never sees
 * any storage credentials). Returns the delivery URL and public ID so they can
 * be recorded in Firestore next to the record.
 *
 * Returns `null` (no throw) when the file cannot be stored, so the record is
 * still saved with its live printable page as fallback.
 */
export async function generateAndStoreDocument(
  kind: "quotation" | "receipt" | "invoice",
  input: PrintableDocumentInput,
): Promise<GeneratedDocumentFile | null> {
  const html = renderPrintableDocument(input);
  const safeReference = String(input.reference || "doc").replace(/[^\w.-]+/g, "-");
  const file = new File([html], `${kind}-${safeReference}.html`, { type: "text/html" });
  try {
    const uploaded = await uploadGenericFileToCloudinary(file, kind);
    return { fileUrl: uploaded.url, publicId: uploaded.publicId };
  } catch {
    return null;
  }
}

/**
 * Opens the printable document in a new tab from data the signed-in user
 * already has (no extra auth round-trip). The tab shows the same sheet the
 * API print route renders, with a Print / Save-PDF toolbar.
 */
export function openPrintableDocument(input: PrintableDocumentInput) {
  const html = renderPrintableDocument(input);
  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
