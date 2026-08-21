import { ApiError, errorResponse, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents?docType=quotation — staff list of farm documents and
 * business paperwork (quotations, receipts, invoices). Files themselves live in
 * Cloudinary (unsigned branch_farm preset) or Firebase Storage; this indexes them.
 */
export async function GET(request: Request) {
  try {
    const { db } = await requireStaff(request);
    const docType = new URL(request.url).searchParams.get("docType");
    const query = db.collection("farmDocuments").orderBy("createdAt", "desc").limit(500);
    const snapshot = await query.get();
    const documents = snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt?.toDate?.().toISOString() ?? data.createdAt,
        } as Record<string, unknown>;
      })
      .filter((doc) => {
        const type = String(doc.docType || "general");
        return !docType || docType === "all" || type === docType;
      });
    return Response.json({ count: documents.length, documents });
  } catch (cause) {
    return errorResponse(cause);
  }
}

const DOC_TYPES = new Set(["general", "quotation", "receipt", "invoice"]);

/**
 * POST /api/documents — register an uploaded document (its Cloudinary/Firebase
 * URL) in the farm index. Body: { name, fileName, fileType, fileSize,
 * category, docType, downloadUrl, storagePath?, cloudinaryPublicId?,
 * description?, relatedAnimalId?, relatedOrderId? }.
 */
export async function POST(request: Request) {
  try {
    const { db, actor } = await requireStaff(request);
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const downloadUrl = String(body.downloadUrl || "").trim();
    if (name.length < 2) throw new ApiError(400, "Enter a name for the document.");
    if (!downloadUrl) throw new ApiError(400, "Provide the downloadUrl of the uploaded file.");
    const docType = String(body.docType || "general");
    if (!DOC_TYPES.has(docType)) throw new ApiError(400, "docType must be general, quotation, receipt or invoice.");

    const payload = {
      name,
      description: String(body.description || ""),
      fileName: String(body.fileName || name),
      fileType: String(body.fileType || "application/octet-stream"),
      fileSize: Number(body.fileSize || 0),
      category: String(body.category || "other"),
      docType,
      downloadUrl,
      storagePath: String(body.storagePath || ""),
      cloudinaryPublicId: body.cloudinaryPublicId ? String(body.cloudinaryPublicId) : "",
      relatedAnimalId: String(body.relatedAnimalId || ""),
      relatedOrderId: String(body.relatedOrderId || ""),
      createdBy: actor.uid,
      createdByName: actor.name,
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
    };
    const ref = await db.collection("farmDocuments").add(payload);
    return Response.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (cause) {
    return errorResponse(cause);
  }
}
