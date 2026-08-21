import type { Order, Product } from "@/types";

const DEMO_ORDERS_KEY = "thebranchfarm:demo-orders";

/**
 * Sample catalog. These only appear when Firestore is unreachable (e.g. a
 * local/preview build without a deployed Firebase backend) so the storefront
 * can be explored end-to-end. An admin can also seed them into the real
 * `products` collection from the Products page.
 */
export const DEMO_PRODUCTS: Omit<Product, "id">[] = [
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
    active: true,
    featured: true,
  },
  {
    name: "Raw milk",
    kind: "produce",
    category: "dairy",
    description:
      "Fresh, full-cream raw milk from our dairy herd. Chilled and bottled the same morning.",
    price: 28,
    unit: "litre",
    stock: 120,
    trackInventory: true,
    image: "/media/raw-milk.jpg",
    active: true,
    featured: true,
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
    active: true,
    featured: true,
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
    active: true,
    featured: true,
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
    image: "/media/lashubile.jpg",
    active: true,
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
    image: "/media/farm-operations.jpg",
    active: true,
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
