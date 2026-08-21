import { NextResponse } from "next/server";
import { getCloudinaryConfig, createCloudinarySignature } from "@/lib/cloudinary";
import { requireAuthorizedUser } from "@/lib/firebase/admin";

const folders = new Set(["products", "gallery", "animals", "documents", "profiles"]);

export async function POST(request: Request) {
  try {
    await requireAuthorizedUser(request, ["staff", "admin"]);
    const body = await request.json().catch(() => ({}));
    const folderName = folders.has(body.folder) ? body.folder : "products";
    const resourceType = body.resourceType === "raw" ? "raw" : "image";
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const params: Record<string, string | number> = resourceType === "raw"
      ? { folder: `the-branch-farm/${folderName}`, resource_type: "raw", timestamp }
      : { folder: `the-branch-farm/${folderName}`, timestamp, transformation: "f_auto,q_auto:good,c_limit,w_1800,h_1800" };
    const signature = createCloudinarySignature(params, apiSecret);
    return NextResponse.json({ cloudName, apiKey, signature, resourceType, ...params });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload-unavailable";
    const status = message === "unauthenticated" ? 401 : message === "permission-denied" ? 403 : message === "cloudinary-not-configured" ? 503 : 500;
    return NextResponse.json({ error: status === 503 ? "Media upload is not configured on this deployment." : "Upload authorization failed." }, { status });
  }
}
