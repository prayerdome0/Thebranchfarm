import { adminConfigured, getAdmin } from "@/lib/server/admin";
import { uploadsConfigured } from "@/lib/server/mediaUploads";

export const dynamic = "force-dynamic";

/** GET /api/health — service status for uptime checks and the workspace. */
export async function GET() {
  const admin = getAdmin();
  return Response.json({
    status: "ok",
    service: "the-branch-farm",
    time: new Date().toISOString(),
    firebaseAdmin: admin ? "configured" : adminConfigured() ? "misconfigured" : "not-configured",
    // Media storage is wired server-side only — no cloud identifiers are
    // reported here on purpose.
    mediaUploads: uploadsConfigured() ? "server-signed" : "not-configured",
  });
}
