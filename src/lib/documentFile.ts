"use client";

import {
  cloudinaryEnabled,
  resolveCloudinaryConfig,
  uploadGenericFileToCloudinary,
} from "@/lib/cloudinary";
import { renderPrintableDocument, type PrintableDocumentInput } from "@/lib/server/printable";
import type { FarmSettings } from "@/types";

export interface GeneratedDocumentFile {
  fileUrl: string;
  publicId: string;
}

/**
 * Renders the printable document and stores it in Cloudinary (unsigned
 * `branch_farm_unsigned` preset, no folders). Returns the delivery URL and
 * public ID so they can be recorded in Firestore next to the record.
 *
 * Returns `null` (no throw) when Cloudinary is not configured, so the record
 * is still saved with its live printable page as fallback.
 */
export async function generateAndStoreDocument(
  kind: "quotation" | "receipt" | "invoice",
  input: PrintableDocumentInput,
  settings?: Partial<FarmSettings> | null,
): Promise<GeneratedDocumentFile | null> {
  const html = renderPrintableDocument(input);
  const safeReference = String(input.reference || "doc").replace(/[^\w.-]+/g, "-");
  const file = new File([html], `${kind}-${safeReference}.html`, { type: "text/html" });
  const config = resolveCloudinaryConfig(settings);
  if (!cloudinaryEnabled(config)) return null;
  try {
    const uploaded = await uploadGenericFileToCloudinary(file, config, kind);
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
