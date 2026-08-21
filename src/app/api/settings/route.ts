import { BUSINESS, STORE } from "@/lib/constants";
import { getAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/settings — the public storefront configuration (currency, delivery,
 * promo, Cloudinary upload preset). Falls back to the built-in defaults when
 * the backend is not reachable.
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
    cloudinaryUploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "branch_farm",
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
