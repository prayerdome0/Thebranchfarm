import { STORE } from "@/lib/constants";
import { DEMO_PRODUCTS } from "@/lib/store";
import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";
import { generateOrderReference } from "@/lib/store";

export const dynamic = "force-dynamic";

interface OrderItemInput {
  productId?: string;
  quantity?: number;
}

function serialize<T extends Record<string, unknown>>(id: string, data: Record<string, unknown>): T {
  const output: Record<string, unknown> = { id, ...data };
  for (const key of ["createdAt", "updatedAt", "signedAt"] as const) {
    const value = output[key] as { seconds?: number; toDate?: () => Date } | string | undefined;
    if (value && typeof value === "object" && typeof value.toDate === "function") {
      output[key] = value.toDate().toISOString();
    } else if (value && typeof value === "object" && typeof value.seconds === "number") {
      output[key] = new Date(value.seconds * 1000).toISOString();
    }
  }
  return output as T;
}

/** GET /api/orders — staff list of all orders (newest first). */
export async function GET(request: Request) {
  try {
    const { db } = await requireStaff(request);
    const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(500).get();
    return Response.json({
      count: snapshot.size,
      orders: snapshot.docs.map((doc) => serialize(doc.id, doc.data() as Record<string, unknown>)),
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}

/**
 * POST /api/orders — place a customer order (the API twin of storefront
 * checkout). Send `{ items: [{ productId, quantity }], customer, fulfillment,
 * deliveryAddress?, notes?, paymentMethod? }`. Prices are taken from the
 * catalogue — never trusted from the caller — and stock is decremented
 * atomically so a product can never be oversold.
 */
export async function POST(request: Request) {
  try {
    const admin = getAdmin();
    if (!admin) {
      throw new ApiError(
        503,
        "Order placement through the API needs Firebase Admin credentials. Place orders through the storefront checkout, or set FIREBASE_ADMIN_*.",
      );
    }
    const body = (await request.json()) as {
      items?: OrderItemInput[];
      customer?: { name?: string; phone?: string; email?: string };
      fulfillment?: "pickup" | "delivery";
      deliveryAddress?: string;
      notes?: string;
      paymentMethod?: string;
    };

    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new ApiError(400, "Add at least one item to the order.");
    const name = String(body.customer?.name || "").trim();
    const phone = String(body.customer?.phone || "").trim();
    if (name.length < 2) throw new ApiError(400, "Enter the customer name.");
    if (phone.length < 8) throw new ApiError(400, "Enter a valid customer phone number.");
    const fulfillment = body.fulfillment === "delivery" ? "delivery" : "pickup";

    // Resolve settings (delivery fee / threshold / currency) with safe defaults.
    const settingsSnap = await admin.db.doc("settings/farm").get();
    const settings = settingsSnap.data() || {};
    const currency = String(settings.currency || STORE.currency);
    const deliveryFeeSetting = Number(settings.deliveryFee ?? STORE.deliveryFee);
    const freeThreshold = Number(settings.freeDeliveryThreshold ?? STORE.freeDeliveryThreshold);

    const priced: Array<{ productId: string; name: string; unit: string; price: number; quantity: number; image?: string }> = [];
    const missing: string[] = [];

    const reference = generateOrderReference();
    const orderRef = admin.db.collection("orders").doc();
    const createdAt = new Date();

    await admin.db.runTransaction(async (transaction) => {
      for (const item of items) {
        const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
        let product: { id: string; data: Record<string, unknown> } | null = null;

        if (item.productId && admin) {
          const doc = await transaction.get(admin.db.doc(`products/${item.productId}`));
          if (doc.exists) product = { id: doc.id, data: doc.data() as Record<string, unknown> };
        } else if (item.productId?.startsWith("demo-")) {
          const demo = DEMO_PRODUCTS[Number(item.productId.replace(/^demo-/, "")) - 1];
          if (demo) product = { id: item.productId, data: demo as unknown as Record<string, unknown> };
        }
        if (!product) {
          missing.push(item.productId || "unknown product");
          return;
        }

        const trackInventory = product.data.trackInventory !== false;
        const stock = Number(product.data.stock ?? 0);
        if (trackInventory && product.data.allowBackorder !== true && stock < quantity) {
          throw new ApiError(
            409,
            `Insufficient stock for "${product.data.name}". Only ${stock} left.`,
          );
        }
        if (trackInventory && !product.id.startsWith("demo-")) {
          transaction.update(admin.db.doc(`products/${product.id}`), {
            stock: stock - quantity,
          });
        }
        priced.push({
          productId: product.id,
          name: String(product.data.name),
          unit: String(product.data.unit || ""),
          price: Number(product.data.salePrice || product.data.price || 0),
          quantity,
          image: product.data.image ? String(product.data.image) : undefined,
        });
      }

      const subtotal = priced.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const deliveryFee =
        fulfillment === "delivery" && subtotal < freeThreshold ? deliveryFeeSetting : 0;
      const total = subtotal + deliveryFee;

      transaction.set(orderRef, {
        reference,
        items: priced,
        subtotal,
        deliveryFee,
        total,
        customer: {
          name,
          phone,
          email: body.customer?.email ? String(body.customer.email).trim().toLowerCase() : "",
        },
        fulfillment,
        deliveryAddress: body.deliveryAddress ? String(body.deliveryAddress) : "",
        notes: body.notes ? String(body.notes) : "",
        paymentMethod: body.paymentMethod ? String(body.paymentMethod) : "",
        status: "pending",
        paymentStatus: "unpaid",
        createdAt,
        updatedAt: createdAt,
      });
    });

    if (missing.length) throw new ApiError(400, `Unknown products: ${missing.join(", ")}`);
    const saved = await orderRef.get();
    return Response.json(
      {
        ...serialize(orderRef.id, saved.data() as Record<string, unknown>),
        currency,
        trackUrl: `/track?reference=${reference}`,
      },
      { status: 201 },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
