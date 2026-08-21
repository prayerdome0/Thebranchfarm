import { adminConfigured, getAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/** GET /api/health — service status for uptime checks and the workspace. */
export async function GET() {
  const admin = getAdmin();
  return Response.json({
    status: "ok",
    service: "the-branch-farm",
    time: new Date().toISOString(),
    firebaseAdmin: admin ? "configured" : adminConfigured() ? "misconfigured" : "not-configured",
    cloudinaryPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "branch_farm",
  });
}
