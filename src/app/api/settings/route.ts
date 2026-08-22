import { BUSINESS, STORE } from "@/lib/constants";
import { getAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings — the public storefront configuration (currency, delivery,
 * promo). Falls back to the built-in defaults when the backend is not
 * reachable. Media storage is configured server-side only and is deliberately
 * not part of the public settings payload.
 */
export async function GET() {
  const defaults = {
    farmName: BUSINESS.name,
    slogan: BUSINESS.slogan,
    location: BUSINESS.location,
    phone: BUSINESS.phoneDisplay,
    whatsapp: BUSINESS.whatsappDisplay,
    currency: STORE.currency,
    deliveryFee: STORE.deliveryFee,
    freeDeliveryThreshold: STORE.freeDeliveryThreshold,
    promoCode: "",
    promoDiscountPercent: 0,
  };

  const admin = getAdmin();
  if (admin) {
    try {
      const snapshot = await admin.db.doc("settings/farm").get();
      if (snapshot.exists) {
        const data = snapshot.data() as Record<string, unknown>;
        const merged = { ...defaults };
        for (const key of Object.keys(defaults)) {
          if (data[key] !== undefined && data[key] !== null) {
            (merged as Record<string, unknown>)[key] = data[key];
          }
        }
        return Response.json(merged);
      }
    } catch {
      /* fall through to defaults */
    }
  }
  return Response.json(defaults);
}
