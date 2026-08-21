import { STORE } from "@/lib/constants";
import { DEMO_PRODUCTS } from "@/lib/store";
import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";
import { renderPrintableDocument } from "@/lib/server/printable";

export const dynamic = "force-dynamic";

interface QuotationItemInput {
  productId?: string;
  name?: string;
  unit?: string;
  price?: number;
  quantity?: number;
}

function quotationReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `Q-${suffix}`;
}

/**
 * POST /api/quotations — build a printable farm quotation. Body:
 * `{ items: [{ productId?, name?, unit?, price?, quantity }], customer?, notes?, validDays? }`.
 * Items with a known productId are re-priced from the catalogue; ad-hoc items
 * (e.g. the customer's cart in demo mode) use the supplied price. The quote is
 * archived in Firestore when Admin credentials are available.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: QuotationItemInput[];
      customer?: { name?: string; phone?: string; email?: string };
      notes?: string;
      validDays?: number;
    };
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) throw new ApiError(400, "Add at least one item to the quotation.");

    const admin = getAdmin();
    let currency: string = STORE.currency;
    let deliveryFeeSetting: number = STORE.deliveryFee;

    // Resolve catalogue prices for items that reference a product.
    const priced: Array<{ productId: string; name: string; unit: string; price: number; quantity: number }> = [];
    if (admin) {
      const settingsSnap = await admin.db.doc("settings/farm").get();
      const settings = settingsSnap.data();
      if (settings) {
        currency = String(settings.currency || currency);
        deliveryFeeSetting = Number(settings.deliveryFee ?? deliveryFeeSetting);
      }
    }
    for (const item of items) {
      const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
      let name = String(item.name || "").trim();
      let unit = String(item.unit || "");
      let price = Number(item.price);

      if (item.productId) {
        if (admin) {
          const doc = await admin.db.doc(`products/${item.productId}`).get();
          if (doc.exists) {
            const product = doc.data() as (typeof DEMO_PRODUCTS)[number];
            name = product.name;
            unit = product.unit || unit;
            price = Number(product.salePrice || product.price || price);
          }
        }
        if (item.productId.startsWith("demo-")) {
          const demo = DEMO_PRODUCTS[Number(item.productId.replace(/^demo-/, "")) - 1];
          if (demo) {
            name = demo.name;
            unit = demo.unit || unit;
            price = Number(demo.salePrice || demo.price || price);
          }
        }
      }
      if (!name) throw new ApiError(400, "One of the items has no product name.");
      if (!Number.isFinite(price) || price < 0) throw new ApiError(400, `Enter a valid price for "${name}".`);
      priced.push({ productId: item.productId || "ad-hoc", name, unit, price, quantity });
    }

    const subtotal = priced.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const reference = quotationReference();
    const validDays = Math.min(90, Math.max(1, Math.floor(Number(body.validDays) || 14)));
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (admin) {
      await admin.db.collection("quotations").add({
        reference,
        items: priced,
        subtotal,
        deliveryFee: deliveryFeeSetting,
        total: subtotal + deliveryFeeSetting,
        currency,
        customer: {
          name: String(body.customer?.name || "").trim(),
          phone: String(body.customer?.phone || "").trim(),
          email: String(body.customer?.email || "").trim(),
        },
        notes: String(body.notes || ""),
        status: "sent",
        validUntil,
        createdAt: now,
      });
    }

    const html = renderPrintableDocument({
      kind: "quotation",
      reference,
      date: now,
      lines: priced,
      subtotal,
      deliveryFee: 0,
      total: subtotal,
      currency,
      customer: body.customer,
      notes:
        body.notes ||
        "Delivery available on request — the fee is confirmed when the order is placed.",
      validUntil,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (cause) {
    return errorResponse(cause);
  }
}

/** GET /api/quotations — staff list of archived quotations. */
export async function GET(request: Request) {
  try {
    const { db } = await requireStaff(request);
    const snapshot = await db.collection("quotations").orderBy("createdAt", "desc").limit(200).get();
    return Response.json({
      count: snapshot.size,
      quotations: snapshot.docs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const createdAt = data.createdAt as { toDate?: () => Date } | undefined;
        const validUntil = data.validUntil as { toDate?: () => Date } | undefined;
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt?.toDate?.().toISOString() ?? data.createdAt,
          validUntil: validUntil?.toDate?.().toISOString() ?? data.validUntil,
        };
      }),
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
