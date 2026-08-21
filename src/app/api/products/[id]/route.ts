import { DEMO_PRODUCTS } from "@/lib/store";
import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/** GET /api/products/:id — a single catalogue product. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    if (admin) {
      const snapshot = await admin.db.doc(`products/${id}`).get();
      if (snapshot.exists) {
        return Response.json({ id: snapshot.id, ...snapshot.data() });
      }
    }
    const demoIndex = Number(id.replace(/^demo-/, ""));
    const demo = DEMO_PRODUCTS[demoIndex - 1];
    if (demo) return Response.json({ id, ...demo });
    throw new ApiError(404, "Product not found.");
  } catch (cause) {
    return errorResponse(cause);
  }
}

/** PATCH /api/products/:id — staff update a product. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db, actor } = await requireStaff(request);
    const body = (await request.json()) as Record<string, unknown>;
    const ref = db.doc(`products/${id}`);
    const existing = await ref.get();
    if (!existing.exists) throw new ApiError(404, "Product not found.");
    await ref.update({
      ...body,
      updatedBy: actor.uid,
      updatedByName: actor.name,
      updatedAt: new Date(),
    });
    const updated = await ref.get();
    return Response.json({ id: updated.id, ...updated.data() });
  } catch (cause) {
    return errorResponse(cause);
  }
}

/** DELETE /api/products/:id — admin remove a product. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await requireStaff(request, ["admin"]);
    const ref = db.doc(`products/${id}`);
    const existing = await ref.get();
    if (!existing.exists) throw new ApiError(404, "Product not found.");
    await ref.delete();
    return Response.json({ ok: true, id });
  } catch (cause) {
    return errorResponse(cause);
  }
}
