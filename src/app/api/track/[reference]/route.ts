import { ApiError, errorResponse, getAdmin } from "@/lib/server/admin";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/track/:reference — public order tracking by TB-XXXXXX reference.
 * Returns only what a customer may see (no phone/email/signature).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  try {
    const { reference } = await params;
    const admin = getAdmin();
    if (!admin) {
      throw new ApiError(503, "Live tracking needs FIREBASE_ADMIN_* credentials on the API.");
    }
    const snapshot = await admin.db
      .collection("orders")
      .where("reference", "==", reference.trim().toUpperCase())
      .limit(1)
      .get();
    const doc = snapshot.docs[0];
    if (!doc) throw new ApiError(404, "No order with that reference.");
    const order = { id: doc.id, ...doc.data() } as Order;
    const createdAt = order.createdAt as { toDate?: () => Date } | undefined;

    const items = (order.items || []).map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
    }));

    return Response.json({
      reference: order.reference,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
      paymentStatus: order.paymentStatus,
      paymentLabel: PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus,
      total: order.total,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      fulfillment: order.fulfillment,
      customerName: order.customer?.name || "",
      deliveryAddress: order.deliveryAddress,
      deliveryLocation: order.deliveryLocation,
      notes: order.notes,
      paymentMethod: order.paymentMethod,
      createdAt: createdAt?.toDate?.().toISOString() ?? order.createdAt,
      receiptUrl: `/api/orders/${doc.id}/receipt?reference=${encodeURIComponent(order.reference)}`,
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
