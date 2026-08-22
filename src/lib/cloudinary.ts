"use client";

import { CLOUDINARY } from "@/lib/constants";
import { auth } from "@/lib/firebase/config";

/**
 * Media uploads for the farm's photos, videos and paperwork.
 *
 * SECURITY: every upload goes through this app's own authenticated server
 * route (/api/uploads). The browser never receives a cloud name, API key,
 * API secret or upload preset — the server signs and forwards the file, and
 * only the final delivery URL comes back. Ownership is identified by the
 * application/database (recordType + recordId); there are no folders.
 */

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

export class CloudinaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudinaryError";
  }
}

async function sessionToken(): Promise<string> {
  try {
    const current = auth.currentUser;
    return current ? await current.getIdToken() : "";
  } catch {
    return "";
  }
}

/**
 * Core upload — posts the file to this app's authenticated server route,
 * which signs and stores it server-side. NO FOLDERS: the recordType +
 * recordId stored in Firestore identify what each file belongs to.
 */
export function uploadToCloudinary(
  file: File,
  options: {
    resourceType?: "image" | "video" | "raw" | "auto";
    recordType?: string;
    onProgress?: (percent: number) => void;
  } = {},
): Promise<CloudinaryUploadResult> {
  const { resourceType = "auto", onProgress } = options;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("resourceType", resourceType);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", CLOUDINARY.uploadEndpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && parsed.url) {
          onProgress?.(100);
          resolve({
            url: parsed.url as string,
            publicId: String(parsed.publicId || ""),
            bytes: Number(parsed.bytes || file.size),
            format: String(parsed.format || ""),
            resourceType: String(parsed.resourceType || resourceType),
            displayName: String(parsed.displayName || parsed.originalFilename || file.name),
            originalFilename: String(parsed.originalFilename || file.name),
          });
        } else {
          reject(new CloudinaryError(String(parsed?.error || "Upload failed. Please try again.")));
        }
      } catch {
        reject(new CloudinaryError("The upload response could not be read. Please try again."));
      }
    };
    xhr.onerror = () =>
      reject(new CloudinaryError("Could not reach the farm server. Check your connection and try again."));
    xhr.onabort = () => reject(new CloudinaryError("The upload was cancelled."));
    sessionToken().then((token) => {
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.send(body);
    }, () => reject(new CloudinaryError("Your session could not be verified. Sign in again and retry.")));
  });
}

// Typed upload helpers — all go through the same secure server path, no folders.
export function uploadProductImageToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "image", recordType: "product", onProgress });
}

export function uploadFarmDocumentToCloudinary(
  file: File,
  docType: "general" | "quotation" | "receipt" | "invoice" | "purchase_order" | "delivery_note" | "contract" | "customer" | "supplier" | "staff" | "animal" | "other",
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { resourceType: "auto", recordType: docType, onProgress });
}

export function uploadBusinessDocumentToCloudinary(
  file: File,
  docType: "quotation" | "receipt" | "invoice",
  onProgress?: (percent: number) => void,
) {
  return uploadFarmDocumentToCloudinary(file, docType, onProgress);
}

export function uploadAnimalPhotoToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "image", recordType: "animal", onProgress });
}

export function uploadHealthPhotoToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "image", recordType: "animal_health", onProgress });
}

export function uploadFarmVideoToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "video", recordType: "farm_video", onProgress });
}

export function uploadVideoPosterToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "image", recordType: "farm_photo", onProgress });
}

export function uploadFarmPhotoToCloudinary(file: File, onProgress?: (percent: number) => void) {
  return uploadToCloudinary(file, { resourceType: "image", recordType: "farm_photo", onProgress });
}

export function uploadGenericFileToCloudinary(
  file: File,
  recordType: string,
  onProgress?: (percent: number) => void,
) {
  return uploadToCloudinary(file, { resourceType: "auto", recordType, onProgress });
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
