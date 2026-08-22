import { adminConfigured, getAdmin } from "@/lib/server/admin";
import { uploadsConfigured } from "@/lib/server/mediaUploads";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — service status for uptime checks and the workspace.
 *
 * `mediaUploads` reports how the PRIMARY upload path is wired:
 *  - "server-signed"          — Cloudinary credentials are configured; every
 *                               upload is signed and proxied by this server.
 *  - "unsigned-fallback"      — no server credentials found; browsers upload
 *                               directly with the farm's unsigned preset
 *                               (still functional, configure CLOUDINARY_* to
 *                               upgrade to the signed path).
 * No cloud identifiers are reported here on purpose.
 */
export async function GET() {
  const admin = getAdmin();
  return Response.json({
    status: "ok",
    service: "the-branch-farm",
    time: new Date().toISOString(),
    firebaseAdmin: admin
      ? "configured"
      : adminConfigured()
        ? "misconfigured"
        : "not-configured",
    mediaUploads: uploadsConfigured() ? "server-signed" : "unsigned-fallback",
  });
}
