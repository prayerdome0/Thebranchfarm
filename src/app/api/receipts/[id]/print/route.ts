import { errorResponse, requireStaff } from "@/lib/server/admin";
import { buildReceiptDocumentInput } from "@/lib/documents";
import { renderPrintableDocument } from "@/lib/server/printable";
import type { Receipt } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/receipts/:id/print — staff printable view of a stored receipt, including
 * the signature block (Authorized Signature / [signed digitally]).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await requireStaff(_request);
    const snapshot = await db.doc(`receipts/${id}`).get();
    if (!snapshot.exists) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document unavailable</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#1d2a20"><h1>Document unavailable</h1><p>Receipt not found.</p><p><a href="/documents/receipts">Back to the dashboard</a></p></body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    const receipt = { id: snapshot.id, ...snapshot.data() } as Receipt;
    const html = renderPrintableDocument({
      ...buildReceiptDocumentInput(receipt),
      backHref: "/documents/receipts",
      backLabel: "Back to receipts",
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (cause) {
    return errorResponse(cause);
  }
}
