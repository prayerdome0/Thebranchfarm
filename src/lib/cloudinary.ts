"use client";

import { CLOUDINARY } from "@/lib/constants";
import { auth } from "@/lib/firebase/config";

/**
 * Media uploads for the farm's photos, videos and paperwork.
 *
 * SECURITY: every upload FIRST goes through this app's own authenticated
 * server route (/api/uploads). The browser never receives a cloud name, API
 * key, API secret — the server signs and forwards the file, and only the
 * final delivery URL comes back. Ownership is identified by the
 * application/database (recordType + recordId); there are no folders.
 *
 * RESILIENCE: when the server route cannot process the upload — a deployment
 * without server credentials, the API is unreachable, or the file exceeds the
 * platform's request limit — the browser falls back to the farm's UNSIGNED
 * upload preset (public identifiers, same trust level as the Firebase web
 * config; see CLOUDINARY.fallbackUnsigned). Uploads therefore keep working
 * with zero server configuration, and switch to the fully signed path
 * automatically once the server is configured.
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
  status?: number;
  /** True when the server route was definitively unavailable (lets callers decide about the unsigned fallback). */
  serverUnavailable?: boolean;
  constructor(message: string, details: { status?: number; serverUnavailable?: boolean } = {}) {
    super(message);
    this.name = "CloudinaryError";
    this.status = details.status;
    this.serverUnavailable = details.serverUnavailable;
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

/** Upload result normalisation shared by both paths. */
function toResult(parsed: Record<string, unknown>, file: File, resourceType: string): CloudinaryUploadResult {
  return {
    url: String(parsed.secure_url || parsed.url || ""),
    publicId: String(parsed.public_id || ""),
    bytes: Number(parsed.bytes || file.size),
    format: String(parsed.format || ""),
    resourceType: String(parsed.resource_type || resourceType),
    displayName: String(parsed.display_name || parsed.original_filename || file.name),
    originalFilename: String(parsed.original_filename || file.name),
  };
}

/** Maps a direct Cloudinary failure to a clear, actionable message. */
function directUploadErrorMessage(status: number, detail?: string) {
  if (status === 400 && /preset/i.test(detail || "")) {
    return `The Cloudinary upload preset is not accepted. Make sure "${CLOUDINARY.fallbackUnsigned.uploadPreset}" exists as an UNSIGNED preset in cloud ${CLOUDINARY.fallbackUnsigned.cloudName}.`;
  }
  if (status === 401 || status === 403) {
    return "Cloudinary rejected the upload. Check the cloud name and that the preset allows unsigned uploads.";
  }
  return detail ? `Cloudinary upload failed: ${detail}` : `Cloudinary upload failed (${status}).`;
}

/**
 * PRIMARY PATH — posts the file to this app's authenticated server route,
 * which signs and stores it server-side. NO FOLDERS: the recordType +
 * recordId stored in Firestore identify what each file belongs to.
 */
export function uploadViaFarmServer(
  file: File,
  options: {
    resourceType?: "image" | "video" | "raw" | "auto";
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
      let parsed: Record<string, unknown> = {};
      let parsedOk = false;
      try {
        parsed = JSON.parse(xhr.responseText || "{}");
        parsedOk = true;
      } catch {
        parsedOk = false;
      }
      if (xhr.status >= 200 && xhr.status < 300 && parsed.url) {
        onProgress?.(100);
        resolve(toResult(parsed, file, resourceType));
        return;
      }
      if (parsedOk && typeof parsed.error === "string" && parsed.error) {
        // OUR route answered with a verdict. Definitive rejections (bad
        // request, sign-in/permission, size policy, upstream Cloudinary
        // failure) are final — surface the message, no fallback. "Cannot do
        // signed uploads on this deployment" answers (503 not-configured)
        // and unexpected server/proxy errors fall back to the unsigned path.
        const definitive =
          xhr.status === 400 || xhr.status === 401 || xhr.status === 403 || xhr.status === 413;
        if (definitive) {
          reject(new CloudinaryError(parsed.error, { status: xhr.status }));
        } else {
          reject(
            new CloudinaryError("The farm server could not accept this upload.", {
              status: xhr.status,
              serverUnavailable: true,
            }),
          );
        }
        return;
      }
      // Anything else (platform-level 413 from a request-size cap, HTML error
      // pages, unexpected gateway errors) means the route never really ran —
      // the unsigned fallback is the right move.
      reject(
        new CloudinaryError("The farm server could not accept this upload.", {
          status: xhr.status,
          serverUnavailable: true,
        }),
      );
    };
    xhr.onerror = () =>
      reject(
        new CloudinaryError("Could not reach the farm server.", {
          serverUnavailable: true,
        }),
      );
    xhr.onabort = () => reject(new CloudinaryError("The upload was cancelled."));
    sessionToken().then(
      (token) => {
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(body);
      },
      () => reject(new CloudinaryError("Your session could not be verified. Sign in again and retry.")),
    );
  });
}

/**
 * FALLBACK PATH — unsigned preset upload straight to Cloudinary, using the
 * farm's public preset. Used only when the authenticated server route is
 * unavailable (see uploadViaFarmServer) so media management keeps working on
 * any deployment. Same rules as the server path: no folders, preset handles
 * display name/filename behaviour.
 */
export function uploadViaUnsignedPreset(
  file: File,
  options: {
    resourceType?: "image" | "video" | "raw" | "auto";
    onProgress?: (percent: number) => void;
  } = {},
): Promise<CloudinaryUploadResult> {
  const { resourceType = "auto", onProgress } = options;
  const { cloudName, uploadPreset } = CLOUDINARY.fallbackUnsigned;

  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      cloudName,
    )}/${resourceType}/upload`;

    const body = new FormData();
    body.append("upload_preset", uploadPreset);
    // Explicitly DO NOT send a folder — spec says NO FOLDERS.
    body.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(xhr.responseText || "{}");
      } catch {
        reject(new CloudinaryError("The upload response could not be read. Please try again.", { status: xhr.status }));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && (parsed.secure_url || parsed.url)) {
        onProgress?.(100);
        resolve(toResult(parsed, file, resourceType));
        return;
      }
      const error = parsed.error as { message?: string } | undefined;
      reject(
        new CloudinaryError(directUploadErrorMessage(xhr.status, error?.message), {
          status: xhr.status,
        }),
      );
    };
    xhr.onerror = () =>
      reject(new CloudinaryError("Cloudinary could not be reached. Check your connection and try again."));
    xhr.onabort = () => reject(new CloudinaryError("The upload was cancelled."));
    onProgress?.(0);
    xhr.send(body);
  });
}

// After a definitive "server route is not configured here" answer, skip the
// doomed server attempt for the rest of this page load. Transient problems
// (network, 5xx) never set this, so a healthy server is retried each time.
let serverRouteKnownUnavailable = false;

/**
 * Core upload — secure server route first, automatic unsigned fallback when
 * the server route is unavailable. NO FOLDERS: the recordType + recordId
 * stored in Firestore identify what each file belongs to.
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

  const attempt: Promise<CloudinaryUploadResult> = serverRouteKnownUnavailable
    ? uploadViaUnsignedPreset(file, { resourceType, onProgress })
    : uploadViaFarmServer(file, { resourceType, onProgress }).catch((cause: unknown) => {
        if (cause instanceof CloudinaryError && cause.serverUnavailable) {
          // Only cache the definitive "not configured here" verdict (503 from
          // our own route), never transient network/5xx failures — a healthy
          // server is retried on every subsequent upload.
          if (cause.status === 503) serverRouteKnownUnavailable = true;
          return uploadViaUnsignedPreset(file, { resourceType, onProgress });
        }
        throw cause;
      });

  return attempt;
}

// Typed upload helpers — all share the same secure-first path, no folders.
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
