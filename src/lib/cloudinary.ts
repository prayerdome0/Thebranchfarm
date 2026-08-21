"use client";

import { CLOUDINARY } from "@/lib/constants";
import type { FarmSettings } from "@/types";

/**
 * Cloudinary UNSIGNED uploads for the farm's media and paperwork.
 *
 * Uploads go straight from the browser to Cloudinary — no API key or signature
 * is needed. Two things identify the account and preset:
 *
 *   - cloud name  → Settings → Media uploads, or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
 *   - upload preset → "branch_farm" (Settings → Media uploads, or
 *                      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)
 *
 * The preset must exist in Cloudinary as an **unsigned** preset.
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export interface CloudinaryUploadResult {
  /** Public secure URL of the uploaded asset. */
  url: string;
  /** Cloudinary public id (e.g. "branch_farm/products/abc123"). */
  publicId: string;
  /** Bytes uploaded. */
  bytes: number;
  format: string;
  resourceType: string;
}

export function resolveCloudinaryConfig(settings?: Partial<FarmSettings> | null): CloudinaryConfig {
  const cloudName =
    (settings?.cloudinaryCloudName || "").trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    "";
  const uploadPreset =
    (settings?.cloudinaryUploadPreset || "").trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    CLOUDINARY.uploadPreset;
  return { cloudName, uploadPreset };
}

export function cloudinaryEnabled(config: CloudinaryConfig) {
  return Boolean(config.cloudName && config.uploadPreset);
}

export class CloudinaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryError";
  }
}

function cloudinaryErrorMessage(status: number, detail?: string) {
  if (status === 400 && /preset/i.test(detail || "")) {
    return `The Cloudinary upload preset is not accepted. Make sure "${CLOUDINARY.uploadPreset}" exists as an UNSIGNED preset.`;
  }
  if (status === 401 || status === 403) {
    return "Cloudinary rejected the upload. Check the cloud name and that the preset allows unsigned uploads.";
  }
  return detail ? `Cloudinary upload failed: ${detail}` : `Cloudinary upload failed (${status}).`;
}

/**
 * Uploads a file to Cloudinary using the unsigned `branch_farm` preset.
 * `folder` routes the asset into the farm's Cloudinary library
 * (products / quotations / receipts / invoices).
 */
export function uploadToCloudinary(
  file: File,
  options: {
    config: CloudinaryConfig;
    folder?: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    onProgress?: (percent: number) => void;
  },
): Promise<CloudinaryUploadResult> {
  const { config, folder, resourceType = "auto", onProgress } = options;
  if (!cloudinaryEnabled(config)) {
    return Promise.reject(
      new CloudinaryError(
        "Cloudinary is not configured. Add the cloud name under Settings → Media uploads.",
      ),
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    config.cloudName,
  )}/${resourceType}/upload`;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const body = new FormData();
    body.append("upload_preset", config.uploadPreset);
    if (folder) body.append("folder", folder);
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && parsed.secure_url) {
          onProgress?.(100);
          resolve({
            url: parsed.secure_url as string,
            publicId: String(parsed.public_id || ""),
            bytes: Number(parsed.bytes || file.size),
            format: String(parsed.format || ""),
            resourceType: String(parsed.resource_type || resourceType),
          });
        } else {
          reject(
            new CloudinaryError(
              cloudinaryErrorMessage(
                xhr.status,
                parsed?.error?.message ? String(parsed.error.message) : undefined,
              ),
            ),
          );
        }
      } catch {
        reject(new CloudinaryError(cloudinaryErrorMessage(xhr.status)));
      }
    };
    xhr.onerror = () =>
      reject(new CloudinaryError("Could not reach Cloudinary. Check your connection and try again."));
    xhr.onabort = () => reject(new CloudinaryError("The upload was cancelled."));
    xhr.send(body);
  });
}

/** Product photos → `branch_farm/products`. */
export function uploadProductImageToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, {
    config,
    folder: CLOUDINARY.folders.products,
    resourceType: "image",
    onProgress,
  });
}

/** Quotations, receipts and invoices → `branch_farm/<type>`. */
export function uploadBusinessDocumentToCloudinary(
  file: File,
  docType: "quotation" | "receipt" | "invoice",
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, {
    config,
    folder: CLOUDINARY.folders[docType] || "branch_farm/documents",
    resourceType: "auto",
    onProgress,
  });
}
