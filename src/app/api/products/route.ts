import { DEMO_PRODUCTS } from "@/lib/store";
import { ApiError, errorResponse, getAdmin, requireStaff } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

function demoCatalogue() {
  return DEMO_PRODUCTS.map((product, index) => ({
    ...product,
    id: `demo-${index + 1}`,
    createdAt: new Date().toISOString(),
  }));
}

/**
 * GET /api/products — the public catalogue (active products). Without Admin
 * credentials the sample catalogue is served so the endpoint always responds.
 * Query: ?kind=produce|livestock & ?category=eggs|dairy… & ?q=search & ?comingSoon=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const category = url.searchParams.get("category");
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const wantComingSoon = url.searchParams.get("comingSoon");
  const includeInactive = url.searchParams.get("all") === "1";

  let products: Array<Record<string, unknown>> = [];
  let source: string = "demo";
  const admin = getAdmin();
  if (admin) {
    try {
      const snapshot = await admin.db.collection("products").orderBy("createdAt", "desc").limit(500).get();
      products = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      source = "firestore";
    } catch {
      products = [];
    }
  }
  if (!products.length) {
    products = demoCatalogue() as Array<Record<string, unknown>>;
    source = source === "firestore" ? "firestore-empty" : "demo";
  }

  const staff = includeInactive ? await optionalStaff(request) : null;
  const filtered = products.filter((product) => {
    if (!staff && product.active === false) return false;
    if (kind && product.kind !== kind) return false;
    if (category && product.category !== category) return false;
    if (wantComingSoon === "0" && product.comingSoon) return false;
    if (wantComingSoon === "1" && !product.comingSoon) return false;
    if (q) {
      const haystack = [product.name, product.description, product.unit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return Response.json({ source, count: filtered.length, products: filtered });
}

async function optionalStaff(request: Request) {
  try {
    return await requireStaff(request);
  } catch {
    return null;
  }
}

/**
 * POST /api/products — staff create a catalogue product.
 * Body: product fields (name, kind, category, description, price, unit, …).
 * Auth: `Authorization: Bearer <firebase id token>` of an active staff/admin.
 */
export async function POST(request: Request) {
  try {
    const { db, actor } = await requireStaff(request);
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name || "").trim();
    const price = Number(body.price);
    if (name.length < 2) throw new ApiError(400, "Enter a product name.");
    if (!Number.isFinite(price) || price <= 0) throw new ApiError(400, "Enter a price greater than zero.");

    const payload = {
      ...body,
      name,
      price,
      createdBy: actor.uid,
      createdByName: actor.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const ref = await db.collection("products").add(payload);
    return Response.json({ id: ref.id, ...payload }, { status: 201 });
  } catch (cause) {
    return errorResponse(cause);
  }
}
