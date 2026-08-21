import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

function serialize(id: string, data: Record<string, unknown>) {
  const output: Record<string, unknown> = { id, ...data };
  for (const key of ["createdAt", "updatedAt", "signedAt"] as const) {
    const value = output[key] as { seconds?: number; toDate?: () => Date } | undefined;
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      output[key] = value.toDate().toISOString();
    } else if (value && typeof value === "object" && typeof value.seconds === "number") {
      output[key] = new Date(value.seconds * 1000).toISOString();
    }
  }
  return output;
}

/** GET /api/orders/:id — staff fetch one order. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    if (!admin) throw new ApiError(503, "Set FIREBASE_ADMIN_* to read live orders through the API.");
    await requireStaff(request);

    const reference = new URL(request.url).searchParams.get("reference");
    let snapshot = await admin.db.doc(`orders/${id}`).get();
    if (!snapshot.exists && reference) {
      const byReference = await admin.db
        .collection("orders")
        .where("reference", "==", reference)
        .limit(1)
        .get();
      snapshot = byReference.docs[0] ?? snapshot;
    }
    if (!snapshot.exists) throw new ApiError(404, "Order not found.");
    return Response.json(serialize(snapshot.id, snapshot.data() as Record<string, unknown>));
  } catch (cause) {
    return errorResponse(cause);
  }
}

const PATCHABLE = new Set(["status", "paymentStatus", "notes", "signature", "signedByName", "signedAt"]);

/** PATCH /api/orders/:id — staff update status / payment / signature / notes. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db, actor } = await requireStaff(request);
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (PATCHABLE.has(key)) patch[key] = value;
    }
    if (!Object.keys(patch).length) throw new ApiError(400, "Nothing to update.");

    const ref = db.doc(`orders/${id}`);
    const existing = await ref.get();
    if (!existing.exists) throw new ApiError(404, "Order not found.");
    await ref.update({
      ...patch,
      updatedBy: actor.uid,
      updatedByName: actor.name,
      updatedAt: new Date(),
    });
    const updated = await ref.get();
    return Response.json(serialize(updated.id, updated.data() as Record<string, unknown>));
  } catch (cause) {
    return errorResponse(cause);
  }
}
