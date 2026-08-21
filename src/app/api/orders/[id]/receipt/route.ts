import { ApiError, errorResponse, getAdmin } from "@/lib/server/admin";
import { renderPrintableDocument } from "@/lib/server/printable";
import { PAYMENT_STATUS_LABELS, FULFILLMENT_LABELS } from "@/lib/constants";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:id/receipt — printable proof of payment for an order.
 * Open to the customer: look up by Firestore id or ?reference=TB-XXXXXX.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = getAdmin();
    if (!admin) {
      throw new ApiError(
        503,
        "Receipts need FIREBASE_ADMIN_* credentials so the API can read the order.",
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
      kind: "receipt",
      reference: order.reference,
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
      paymentStatus: order.paymentStatus ? PAYMENT_STATUS_LABELS[order.paymentStatus] : undefined,
      notes: order.notes,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (cause) {
    if (cause instanceof ApiError) {
      const message =
        cause.status === 503
          ? `${cause.message} Receipts for orders placed in demo mode are stored in the browser only.`
          : cause.message;
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt unavailable</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:40px;color:#1d2a20"><h1>Receipt unavailable</h1><p>${message}</p><p><a href="/">Back to the farm shop</a></p></body></html>`,
        { status: cause.status, headers: { "Content-Type": "text/html; charset=utf-8" } },
      );
    }
    return errorResponse(cause);
  }
}
