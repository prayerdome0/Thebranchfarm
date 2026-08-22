import { errorResponse, requireStaff } from "@/lib/server/admin";
import { buildInvoiceDocumentInput } from "@/lib/documents";
import { renderPrintableDocument } from "@/lib/server/printable";
import type { Invoice } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/:id/print — staff printable view of a stored invoice.
 * Opens in the browser with a Print / Save-PDF toolbar.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { db } = await requireStaff(_request);
    const snapshot = await db.doc(`invoices/${id}`).get();
    if (!snapshot.exists) {
      return notFoundHtml("Invoice not found", "/documents/invoices");
    }
    const invoice = { id: snapshot.id, ...snapshot.data() } as Invoice;
    const html = renderPrintableDocument({
      ...buildInvoiceDocumentInput(invoice),
      backHref: "/documents/invoices",
      backLabel: "Back to invoices",
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (cause) {
    return errorResponse(cause);
  }
}

function notFoundHtml(message: string, backTo: string) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Document unavailable</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#1d2a20"><h1>Document unavailable</h1><p>${message}</p><p><a href="${backTo}">Back to the dashboard</a></p></body></html>`,
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
