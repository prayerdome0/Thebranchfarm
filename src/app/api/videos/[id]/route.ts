import { ApiError, errorResponse, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/** DELETE /api/videos/:id — admin remove a farm video. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await requireStaff(request, ["admin"]);
    const ref = db.doc(`videos/${id}`);
    const existing = await ref.get();
    if (!existing.exists) throw new ApiError(404, "Video not found.");
    await ref.delete();
    return Response.json({ ok: true, id });
  } catch (cause) {
    return errorResponse(cause);
  }
}
