"use client";

import { CLOUDINARY } from "@/lib/constants";
import type { FarmSettings } from "@/types";

/**
 * Cloudinary UNSIGNED uploads for the farm's media and paperwork.
 * Spec:
 *  cloud_name: dhad95cch
 *  upload_preset: branch_farm (unsigned)
 *  signing: unsigned
 *  overwrite: false
 *  use_filename: false
 *  unique_filename: false
 *  use_filename_as_display_name: true
 *  use_asset_folder_as_public_id_prefix: false
 *  resource_type: upload (handled as auto/image/video/raw by API)
 *  folders: NONE - application/database identifies ownership
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
  resourceType: string;
  displayName?: string;
  originalFilename?: string;
}

export interface FileRecordMeta {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  displayName: string;
  fileType: string;
  recordType: string;
  recordId: string;
  uploadedBy: string;
  uploadedAt: string;
}

export function resolveCloudinaryConfig(settings?: Partial<FarmSettings> | null): CloudinaryConfig {
  const cloudName =
    (settings?.cloudinaryCloudName || "").trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    CLOUDINARY.cloudName;
  // The farm uses one fixed unsigned preset. Do not allow stale deployment
  // environment values to silently switch upload surfaces to another preset.
  const preset = CLOUDINARY.uploadPreset;
  return { cloudName: cloudName || CLOUDINARY.cloudName, uploadPreset: preset };
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
    return `The Cloudinary upload preset is not accepted. Make sure "${CLOUDINARY.uploadPreset}" exists as an UNSIGNED preset in cloud ${CLOUDINARY.cloudName}.`;
  }
  if (status === 401 || status === 403) {
    return "Cloudinary rejected the upload. Check the cloud name and that the preset allows unsigned uploads.";
  }
  return detail ? `Cloudinary upload failed: ${detail}` : `Cloudinary upload failed (${status}).`;
}

/**
 * Core upload - NO FOLDERS. Everything uses same unsigned preset.
 * The preset itself is configured with:
 * overwrite=false, use_filename=false, unique_filename=false,
 * use_filename_as_display_name=true, use_asset_folder_as_public_id_prefix=false
 */
export function uploadToCloudinary(
  file: File,
  options: {
    config: CloudinaryConfig;
    resourceType?: "image" | "video" | "raw" | "auto";
    recordType?: string;
    recordId?: string;
    onProgress?: (percent: number) => void;
  },
): Promise<CloudinaryUploadResult> {
  const { config, resourceType = "auto", onProgress } = options;
  if (!cloudinaryEnabled(config)) {
    return Promise.reject(
      new CloudinaryError(
        "Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dhad95cch and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=branch_farm",
      ),
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    config.cloudName,
  )}/${resourceType}/upload`;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const body = new FormData();
    body.append("upload_preset", config.uploadPreset);
    // Explicitly DO NOT send folder - spec says NO FOLDERS
    // Let preset handle display_name, unique_filename etc
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
            displayName: String(parsed.display_name || parsed.original_filename || file.name),
            originalFilename: String(parsed.original_filename || file.name),
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

// All uploads go through same path - no folders
export function uploadProductImageToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "image", recordType: "product", onProgress });
}

export function uploadFarmDocumentToCloudinary(
  file: File,
  docType: "general" | "quotation" | "receipt" | "invoice" | "purchase_order" | "delivery_note" | "contract" | "customer" | "supplier" | "staff" | "animal" | "other",
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "auto", recordType: docType, onProgress });
}

export function uploadBusinessDocumentToCloudinary(
  file: File,
  docType: "quotation" | "receipt" | "invoice",
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadFarmDocumentToCloudinary(file, docType, config, onProgress);
}

export function uploadAnimalPhotoToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "image", recordType: "animal", onProgress });
}

export function uploadHealthPhotoToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "image", recordType: "animal_health", onProgress });
}

export function uploadFarmVideoToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "video", recordType: "farm_video", onProgress });
}

export function uploadVideoPosterToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "image", recordType: "farm_photo", onProgress });
}

export function uploadFarmPhotoToCloudinary(
  file: File,
  config: CloudinaryConfig,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "image", recordType: "farm_photo", onProgress });
}

export function uploadGenericFileToCloudinary(
  file: File,
  config: CloudinaryConfig,
  recordType: string,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { config, resourceType: "auto", recordType, onProgress });
}

export function asStoredCloudinaryAsset(result: CloudinaryUploadResult) {
  return { url: result.url, path: `cloudinary:${result.publicId}` };
}

export function buildFileRecord(
  result: CloudinaryUploadResult,
  file: File,
  meta: { recordType: string; recordId: string; uploadedBy: string },
): FileRecordMeta {
  return {
    fileUrl: result.url,
    publicId: result.publicId,
    resourceType: result.resourceType,
    fileName: file.name,
    displayName: result.displayName || file.name,
    fileType: file.type || result.format,
    recordType: meta.recordType,
    recordId: meta.recordId,
    uploadedBy: meta.uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
}
