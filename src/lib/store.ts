import type { FarmVideo, Order, Product } from "@/types";

const DEMO_ORDERS_KEY = "thebranchfarm:demo-orders";
const MY_ORDERS_KEY = "thebranchfarm:my-orders";

/**
 * Sample catalog. These only appear when Firestore is unreachable (e.g. a
 * local/preview build without a deployed Firebase backend) so the storefront
 * can be explored end-to-end. An admin can also seed them into the real
 * `products` collection from the Products page.
 *
 * Live lines: milk at E16 and the two sour-milk (emasi) lines — Latsambile
 * at E20 and Lashubile at E35. Everything else is listed as COMING SOON.
 */
export const DEMO_PRODUCTS: Omit<Product, "id">[] = [
  {
    name: "Fresh milk",
    kind: "produce",
    category: "dairy",
    description:
      "Fresh, full-cream milk from our dairy herd — chilled and bottled the same morning. E16 per litre.",
    price: 16,
    unit: "litre",
    stock: 150,
    trackInventory: true,
    image: "/media/raw-milk.jpg",
    videoUrl: "/media/videos/dairy-morning.mp4",
    videoPosterUrl: "/media/videos/dairy-morning.jpg",
    images: ["/media/milk-bottles.jpg", "/media/milking-parlour.jpg"],
    active: true,
    featured: true,
  },
  {
    name: "Sour milk — Latsambile",
    kind: "produce",
    category: "dairy",
    description:
      "Latsambile, our classic cultured sour milk (emasi) — thick, tangy and naturally set. E20 per 500 ml tub.",
    price: 20,
    unit: "500 ml tub",
    stock: 60,
    trackInventory: true,
    image: "/media/latsambile.jpg",
    videoUrl: "/media/videos/dairy-morning.mp4",
    videoPosterUrl: "/media/latsambile.jpg",
    images: ["/media/emasi-jars.jpg"],
    active: true,
    featured: true,
  },
  {
    name: "Sour milk — Lashubile",
    kind: "produce",
    category: "dairy",
    description:
      "Lashubile, our richer thick sour milk (emasi) — creamier set in a larger tub. E35 per litre tub.",
    price: 35,
    unit: "1 litre tub",
    stock: 40,
    trackInventory: true,
    image: "/media/lashubile.jpg",
    videoUrl: "/media/videos/dairy-morning.mp4",
    videoPosterUrl: "/media/lashubile.jpg",
    images: ["/media/emasi-jars.jpg"],
    active: true,
    featured: true,
  },
  {
    name: "Free-range eggs",
    kind: "produce",
    category: "eggs",
    description:
      "Fresh eggs collected daily from our free-range hens. Sold by the dozen — rich yolks, naturally raised.",
    price: 75,
    unit: "dozen",
    stock: 40,
    trackInventory: true,
    image: "/media/eggs.jpg",
    videoUrl: "/media/videos/harvest-day.mp4",
    videoPosterUrl: "/media/videos/harvest-day.jpg",
    active: true,
    comingSoon: true,
  },
  {
    name: "Free-range chicken",
    kind: "livestock",
    category: "poultry",
    description:
      "Healthy free-range chickens raised on pasture. Sold live, ready to collect from the farm.",
    price: 120,
    unit: "each",
    stock: 25,
    trackInventory: true,
    image: "/media/poultry.jpg",
    videoUrl: "/media/videos/the-herd.mp4",
    videoPosterUrl: "/media/poultry.jpg",
    active: true,
    comingSoon: true,
  },
  {
    name: "Beef heifer",
    kind: "livestock",
    category: "cattle",
    description:
      "Well-bred, healthy beef heifer from our herd. Ideal for breeding or fattening. Price on enquiry for larger lots.",
    price: 9500,
    unit: "each",
    stock: 6,
    trackInventory: true,
    image: "/media/cattle.jpg",
    videoUrl: "/media/videos/the-herd.mp4",
    videoPosterUrl: "/media/videos/the-herd.jpg",
    active: true,
    comingSoon: true,
  },
  {
    name: "Boer goat",
    kind: "livestock",
    category: "goats",
    description:
      "Hardy Boer goats, excellent for meat production. Vaccinated and ready to go.",
    price: 1800,
    unit: "each",
    stock: 12,
    trackInventory: true,
    image: "/media/goats-herd.jpg",
    videoUrl: "/media/videos/the-herd.mp4",
    videoPosterUrl: "/media/goats-herd.jpg",
    active: true,
    comingSoon: true,
  },
  {
    name: "Pastured pigs",
    kind: "livestock",
    category: "pigs",
    description:
      "Healthy pigs raised on pasture with good feed and room to roam. Ask us about availability and pricing.",
    price: 1500,
    unit: "each",
    stock: 8,
    trackInventory: true,
    image: "/media/pigs-pen.jpg",
    videoUrl: "/media/videos/farm-tour.mp4",
    videoPosterUrl: "/media/pigs-pen.jpg",
    active: true,
    comingSoon: true,
  },
  {
    name: "Mixed vegetables",
    kind: "produce",
    category: "vegetables",
    description:
      "A seasonal box of farm vegetables — greens, tomatoes and root crops depending on the harvest.",
    price: 60,
    unit: "box",
    stock: 30,
    trackInventory: true,
    image: "/media/vegetable-garden.jpg",
    videoUrl: "/media/videos/harvest-day.mp4",
    videoPosterUrl: "/media/vegetable-garden.jpg",
    active: true,
    comingSoon: true,
  },
];

/**
 * Sample farm videos (short photo-films cut from gallery stills). They play on
 * the public videos page when Firestore is unreachable and can be seeded into
 * the `videos` collection from the workspace.
 */
export const DEMO_VIDEOS: Omit<FarmVideo, "id">[] = [
  {
    title: "A walk around The Branch Farm",
    description:
      "Golden hour, the day's work and the land that feeds it — a short tour of the farm at Mahlabane.",
    category: "Farm tour",
    videoUrl: "/media/videos/farm-tour.mp4",
    storagePath: "",
    posterUrl: "/media/videos/farm-tour.jpg",
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-18T06:30:00.000Z",
  },
  {
    title: "Dairy morning — from parlour to bottle",
    description:
      "The milking parlour at dawn, fresh milk chilled and bottled, and emasi setting in jars.",
    category: "Produce",
    videoUrl: "/media/videos/dairy-morning.mp4",
    storagePath: "",
    posterUrl: "/media/videos/dairy-morning.jpg",
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-19T05:45:00.000Z",
  },
  {
    title: "The herd out at graze",
    description:
      "Cattle, calves and the Boer goat flock on pasture in the late afternoon.",
    category: "Livestock",
    videoUrl: "/media/videos/the-herd.mp4",
    storagePath: "",
    posterUrl: "/media/videos/the-herd.jpg",
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-20T15:20:00.000Z",
  },
  {
    title: "Harvest day — eggs and greens",
    description:
      "Collecting the morning eggs and picking the day's greens from the garden.",
    category: "Daily life",
    videoUrl: "/media/videos/harvest-day.mp4",
    storagePath: "",
    posterUrl: "/media/videos/harvest-day.jpg",
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-21T07:10:00.000Z",
  },
  {
    title: "Fresh milk — E16 a litre",
    description:
      "Morning milking, chilled and bottled the same day. Available now at E16 per litre, farm-direct.",
    category: "Produce",
    videoUrl: "/media/videos/dairy-morning.mp4",
    storagePath: "",
    posterUrl: "/media/milk-bottles.jpg",
    featured: true,
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-21T09:40:00.000Z",
  },
  {
    title: "Emasi — Latsambile E20 & Lashubile E35",
    description:
      "Our two sour-milk lines setting in the dairy: Latsambile at E20 a 500 ml tub and the richer Lashubile at E35 a litre tub.",
    category: "Produce",
    videoUrl: "/media/videos/dairy-morning.mp4",
    storagePath: "",
    posterUrl: "/media/emasi-jars.jpg",
    featured: true,
    createdBy: "demo",
    createdByName: "The Branch Farm",
    createdAt: "2026-08-21T10:15:00.000Z",
  },
];

function readDemoOrders(): Order[] {
  try {
    const raw = window.localStorage.getItem(DEMO_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeDemoOrders(orders: Order[]) {
  try {
    window.localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Orders placed from this browser are cached locally so the customer always
 * sees their order reference and details right after checkout — even when the
 * live backend is unreachable or a signed-in staff session is required to
 * read orders from Firestore.
 */
function readMyOrders(): Order[] {
  try {
    const raw = window.localStorage.getItem(MY_ORDERS_KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

function writeMyOrders(orders: Order[]) {
  try {
    // Keep the most recent 20 orders only.
    window.localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch {
    /* ignore quota errors */
  }
}

export function saveLocalOrder(order: Order) {
  const orders = [order, ...readMyOrders().filter((item) => item.reference !== order.reference)];
  writeMyOrders(orders);
  return order;
}

export function getLocalOrder(reference: string): Order | null {
  return readMyOrders().find((order) => order.reference === reference) || null;
}

export function listLocalOrders(): Order[] {
  return readMyOrders();
}

export const demoOrders = {
  list: readDemoOrders,
  get: (idOrReference: string) =>
    readDemoOrders().find(
      (order) => order.id === idOrReference || order.reference === idOrReference,
    ) || null,
  add: (order: Order) => {
    const orders = [order, ...readDemoOrders()];
    writeDemoOrders(orders);
    return order;
  },
  update: (id: string, patch: Partial<Order>) => {
    const orders = readDemoOrders().map((order) =>
      order.id === id ? { ...order, ...patch } : order,
    );
    writeDemoOrders(orders);
    return orders.find((order) => order.id === id) || null;
  },
};

/** Human-friendly order reference, e.g. TB-7K2M9Q. */
export function generateOrderReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `TB-${suffix}`;
}
