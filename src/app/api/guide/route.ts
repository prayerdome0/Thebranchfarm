import { errorResponse, requireStaff } from "@/lib/server/admin";
import { buildGuidePdf } from "@/lib/server/guide";

export const dynamic = "force-dynamic";

/**
 * GET /api/guide — the complete in-app user manual as a PDF.
 *
 * ADMIN-ONLY and server-generated on request:
 *  - the caller must present a valid administrator session (Firebase ID
 *    token) — staff and customer sessions are rejected;
 *  - the PDF is never stored in a public folder (or anywhere else) — it is
 *    built in memory and streamed to the authenticated administrator;
 *  - when GUIDE_PDF_PASSWORD is configured the file is additionally
 *    encrypted with that administrator-controlled password. The password
 *    lives only in server configuration: it is never displayed in the UI and
 *    never shipped to the browser.
 */
export async function GET(request: Request) {
  try {
    await requireStaff(request, ["admin"]);
    const pdf = await buildGuidePdf();
    const body = new Uint8Array(pdf);
    return new Response(body.slice().buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="The-Branch-Farm-User-Guide.pdf"',
        "Cache-Control": "no-store, private",
      },
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
