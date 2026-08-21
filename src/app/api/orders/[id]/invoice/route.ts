import { ApiError, errorResponse, getAdmin } from "@/lib/server/admin";
import { renderPrintableDocument } from "@/lib/server/printable";
import { FULFILLMENT_LABELS } from "@/lib/constants";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:id/invoice — a printable invoice (INV-{reference}) for an
 * order. Staff send it with the order; customers may fetch their own with
 * ?reference=TB-XXXXXX.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    if (!admin) {
      throw new ApiError(
        503,
        "Invoices need FIREBASE_ADMIN_* credentials so the API can read the order.",
      );
    }
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
    if (!snapshot.exists) throw new ApiError(404, "Order not found — check the reference.");

    const order = { id: snapshot.id, ...snapshot.data() } as Order;
    const html = renderPrintableDocument({
      kind: "invoice",
      reference: `INV-${order.reference?.replace(/^TB-/, "") ?? snapshot.id.slice(0, 6).toUpperCase()}`,
      date: order.createdAt ?? new Date(),
      lines: order.items?.map((item) => ({
        name: item.name,
        unit: item.unit,
        quantity: item.quantity,
        price: item.price,
      })) || [],
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      customer: order.customer,
      fulfillment: order.fulfillment ? FULFILLMENT_LABELS[order.fulfillment] : undefined,
      deliveryAddress: order.deliveryAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (cause) {
    if (cause instanceof ApiError) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice unavailable</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#1d2a20"><h1>Invoice unavailable</h1><p>${cause.message}</p><p><a href="/">Back to the farm shop</a></p></body></html>`,
        { status: cause.status, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    return errorResponse(cause);
  }
}
