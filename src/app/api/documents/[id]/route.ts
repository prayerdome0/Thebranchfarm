import { ApiError, errorResponse, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/** DELETE /api/documents/:id — admin remove a document record. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await requireStaff(request, ["admin"]);
    const ref = db.doc(`farmDocuments/${id}`);
    const existing = await ref.get();
    if (!existing.exists) throw new ApiError(404, "Document not found.");
    await ref.delete();
    return Response.json({ ok: true, id });
  } catch (cause) {
    return errorResponse(cause);
  }
}
