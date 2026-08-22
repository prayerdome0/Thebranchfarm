import { createHash } from "node:crypto";

/**
 * Server-side media storage configuration.
 *
 * SECURITY: everything in this module stays on the server. The browser never
 * receives a cloud name, API key, API secret or upload preset — client code
 * posts files to /api/uploads and this module signs and forwards the upload.
 *
 * Configure with either
 *   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
 * or the discrete variables
 *   CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
 */

export interface MediaUploadCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export class MediaUploadError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function parseCloudinaryUrl(raw: string): MediaUploadCredentials | null {
  const cleaned = raw.trim().replace(/^['"]|['"]$/g, "").trim();
  if (!cleaned) return null;
  try {
    const u = new URL(cleaned);
    if (u.protocol === "cloudinary:") {
      const apiKey = decodeURIComponent(u.username);
      const apiSecret = decodeURIComponent(u.password);
      const cloudName = decodeURIComponent(u.hostname || u.host);
      if (apiKey && apiSecret && cloudName) {
        return { apiKey, apiSecret, cloudName };
      }
    }
  } catch {
    // fallback regex for malformed url strings
  }
  const match = cleaned.match(/^cloudinary:\/\/([^:]+):([^@]+)@([\w.-]+)(?:\/.*)?$/);
  if (!match) return null;
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

export function mediaCredentials(): MediaUploadCredentials | null {
  const url = (
    process.env.CLOUDINARY_URL ||
    process.env.NEXT_PUBLIC_CLOUDINARY_URL ||
    ""
  ).trim();
  if (url && !/SET_API_KEY|YOUR_API_KEY|your|choose_a|example/i.test(url)) {
    const parsed = parseCloudinaryUrl(url);
    if (parsed) return parsed;
  }
  const cloudName = (
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    ""
  ).trim();
  const apiKey = (
    process.env.CLOUDINARY_API_KEY ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
    ""
  ).trim();
  const apiSecret = (
    process.env.CLOUDINARY_API_SECRET ||
    process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET ||
    ""
  ).trim();
  if (
    cloudName &&
    apiKey &&
    apiSecret &&
    !/YOUR_CLOUD_NAME|your|choose_a|example/i.test(cloudName) &&
    !/YOUR_API_KEY|your|choose_a|example/i.test(apiKey) &&
    !/YOUR_API_SECRET|your|choose_a|example/i.test(apiSecret)
  ) {
    return { cloudName, apiKey, apiSecret };
  }
  return null;
}

export function uploadsConfigured(): boolean {
  return mediaCredentials() !== null;
}

/**
 * Cloudinary signed-upload signature: SHA-1 of the alphabetically sorted
 * `key=value` parameters (excluding `file`, `api_key` and `resource_type`)
 * followed by the API secret.
 */
export function signUploadParams(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`, "utf8").digest("hex");
}

