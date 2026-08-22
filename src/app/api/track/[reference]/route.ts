import { ApiError, errorResponse, getAdmin } from "@/lib/server/admin";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
import type { Order } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/track/:reference — public order tracking by TB-XXXXXX reference.
 *
 * Privacy is strict: anyone may hold or guess a reference, so this returns
 * ONLY the order's public progress (reference, status, fulfillment, date) —
 * never the customer name, phone, email, delivery address, items, prices,
 * totals or payment details.
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

    return Response.json({
      reference: order.reference,
      status: order.status,
      statusLabel: ORDER_STATUS_LABELS[order.status] || order.status,
      fulfillment: order.fulfillment,
      createdAt: createdAt?.toDate?.().toISOString() ?? order.createdAt,
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
