import { ApiError, errorResponse, requireStaff } from "@/lib/server/admin";
import {
  mediaCredentials,
  signUploadParams,
  uploadsConfigured,
} from "@/lib/server/mediaUploads";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ALLOWED_RESOURCE_TYPES = new Set(["image", "video", "raw", "auto"]);
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB — Cloudinary rejects beyond plan limits anyway.

/**
 * POST /api/uploads — authenticated media upload proxy.
 *
 * Staff and admins POST a file (multipart form: `file`, `resourceType`) with
 * their Firebase session token. The server signs the upload with credentials
 * that exist only in server environment variables and forwards it to the
 * media cloud, returning the stored asset details. The browser never sees a
 * cloud name, key, secret or upload preset.
 */
export async function POST(request: Request) {
  try {
    const { actor } = await requireStaff(request);
    if (!uploadsConfigured()) {
      throw new ApiError(
        503,
        "Media uploads are not configured on the server. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET) to enable uploads.",
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new ApiError(400, "Attach a file to upload.");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiError(413, "That file is too large. Upload files up to 200 MB.");
    }
    const resourceType = ALLOWED_RESOURCE_TYPES.has(String(form.get("resourceType")))
      ? String(form.get("resourceType"))
      : "auto";

    const credentials = mediaCredentials()!;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signUploadParams({ timestamp }, credentials.apiSecret);

    const outgoing = new FormData();
    outgoing.append("file", file, file.name);
    outgoing.append("api_key", credentials.apiKey);
    outgoing.append("timestamp", String(timestamp));
    outgoing.append("signature", signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
      credentials.cloudName,
    )}/${resourceType}/upload`;

    let cloudResponse: Response;
    try {
      cloudResponse = await fetch(endpoint, {
        method: "POST",
        body: outgoing,
        signal: AbortSignal.timeout(280_000),
      });
    } catch {
      throw new ApiError(502, "The media cloud could not be reached. Check your connection and try again.");
    }

    const payload = (await cloudResponse.json().catch(() => null)) as
      | { secure_url?: string; public_id?: string; bytes?: number; format?: string; resource_type?: string; display_name?: string; original_filename?: string; error?: { message?: string } }
      | null;

    if (!cloudResponse.ok || !payload?.secure_url) {
      const detail = String(payload?.error?.message || "").replaceAll(credentials.cloudName, "***");
      throw new ApiError(
        cloudResponse.status === 401 || cloudResponse.status === 403 ? 502 : cloudResponse.status,
        detail ? `Media upload failed: ${detail}` : `Media upload failed (${cloudResponse.status}).`,
      );
    }

    console.info(
      `[uploads] ${actor.name} stored a ${resourceType} asset (${file.size} bytes, ${payload.public_id || "no-id"}).`,
    );

    return Response.json({
      url: payload.secure_url,
      publicId: String(payload.public_id || ""),
      bytes: Number(payload.bytes || file.size),
      format: String(payload.format || ""),
      resourceType: String(payload.resource_type || resourceType),
      displayName: String(payload.display_name || payload.original_filename || file.name),
      originalFilename: String(payload.original_filename || file.name),
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
