import type { FarmVideo, Product, ProductCategory } from "@/types";

export const BUSINESS = {
  name: "The Branch Farm",
  slogan: "Nayi Plug",
  established: 2026,
  location: "GG67+P95 Mahlabane, Eswatini",
  milkLocation: "Ngculwini",
  phoneDisplay: "+268 79777668",
  phoneLink: "+26879777668",
  whatsappDisplay: "+268 76581804",
  whatsappLink: "26876581804",
  currency: "E",
  freeDeliveryAreas: ["Manzini", "Matsapha"],
  deliveryNote: "Other locations can be arranged upon request.",
} as const;

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "raw-fresh-full-fat-milk",
    slug: "raw-fresh-full-fat-milk",
    name: "Raw Fresh Full-Fat Milk",
    category: "dairy",
    description: "Naturally rich, raw full-fat milk — fresh from the farm.",
    longDescription:
      "Fresh raw full-fat milk supplied from Ngculwini. Keep refrigerated and boil or pasteurise before consumption in line with your household's food-safety practice.",
    price: 16,
    unit: "litre",
    priceLabel: "E16/L",
    availability: "available",
    stock: null,
    trackStock: false,
    images: ["/media/raw-milk.jpg"],
    location: "Ngculwini",
    featured: true,
  },
  {
    id: "sour-milk-latsambile",
    slug: "sour-milk-latsambile",
    name: "Sour Milk — Latsambile",
    category: "dairy",
    description: "Traditional sour milk in the Latsambile size.",
    longDescription:
      "Creamy traditional sour milk, carefully prepared and chilled. Ask our team about current collection and delivery availability.",
    price: 20,
    unit: "Latsambile",
    priceLabel: "E20",
    availability: "available",
    stock: null,
    trackStock: false,
    images: ["/media/latsambile.jpg"],
    location: "Ngculwini",
    featured: true,
  },
  {
    id: "sour-milk-lashubile",
    slug: "sour-milk-lashubile",
    name: "Sour Milk — Lashubile",
    category: "dairy",
    description: "Traditional sour milk in the larger Lashubile size.",
    longDescription:
      "A generous serving of creamy traditional sour milk, carefully prepared and chilled for family sharing.",
    price: 35,
    unit: "Lashubile",
    priceLabel: "E35",
    availability: "available",
    stock: null,
    trackStock: false,
    images: ["/media/lashubile.jpg"],
    location: "Ngculwini",
    featured: true,
  },
  {
    id: "farm-eggs",
    slug: "farm-eggs",
    name: "Farm Eggs",
    category: "eggs",
    description: "Fresh farm eggs are part of our growing product range.",
    price: 0,
    unit: "tray",
    availability: "coming-soon",
    images: ["/media/eggs.jpg"],
    featured: true,
  },
  {
    id: "farm-beef",
    slug: "farm-beef",
    name: "Farm Beef",
    category: "beef",
    description: "Quality farm beef is planned for a future release.",
    price: 0,
    unit: "kg",
    availability: "coming-soon",
    images: ["/media/cattle.jpg"],
  },
  {
    id: "farm-pork",
    slug: "farm-pork",
    name: "Farm Pork",
    category: "pork",
    description: "Farm pork is planned for a future release.",
    price: 0,
    unit: "kg",
    availability: "coming-soon",
    images: ["/media/farm-operations.jpg"],
  },
  {
    id: "farm-chicken",
    slug: "farm-chicken",
    name: "Farm Chicken",
    category: "chicken",
    description: "Farm chicken is planned for a future release.",
    price: 0,
    unit: "bird",
    availability: "coming-soon",
    images: ["/media/poultry.jpg"],
  },
];

export const PRODUCT_FALLBACK_IMAGES: Record<ProductCategory, string> = {
  dairy: "/media/raw-milk.jpg",
  eggs: "/media/eggs.jpg",
  beef: "/media/cattle.jpg",
  pork: "/media/farm-operations.jpg",
  chicken: "/media/poultry.jpg",
  other: "/media/farm-hero.jpg",
};

/**
 * Films shown on the farm story pages. Posters are local so the story still
 * looks complete when a remote video is unavailable or a visitor is offline.
 */
export const FARM_VIDEOS: FarmVideo[] = [
  {
    id: "cattle-grazing",
    title: "Rooted in care",
    description: "A calm look at cattle, pasture and the patient work behind good dairy.",
    category: "Livestock",
    src: "https://videos.pexels.com/video-files/855340/855340-hd_1920_1080_25fps.mp4",
    poster: "/media/cattle.jpg",
  },
  {
    id: "dairy-morning",
    title: "The dairy rhythm",
    description: "Traditional milking in motion — a visual note on the care behind fresh milk.",
    category: "Dairy",
    src: "https://videos.pexels.com/video-files/8064118/8064118-hd_1920_1080_24fps.mp4",
    poster: "/media/raw-milk.jpg",
  },
  {
    id: "poultry-growing",
    title: "A range that is growing",
    description: "Poultry is part of our future range and will launch when the farm is ready.",
    category: "Poultry",
    src: "https://videos.pexels.com/video-files/4458054/4458054-uhd_2560_1440_24fps.mp4",
    poster: "/media/poultry.jpg",
  },
  {
    id: "farm-eggs",
    title: "Gathered with intention",
    description: "A closer look at eggs as we prepare a future product line for local customers.",
    category: "Future products",
    src: "https://videos.pexels.com/video-files/7033772/7033772-uhd_2560_1440_25fps.mp4",
    poster: "/media/eggs.jpg",
  },
];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out-for-delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

export const ORDER_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["out-for-delivery", "delivered", "cancelled"],
  "out-for-delivery": ["delivered", "cancelled"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Order received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const FREE_DELIVERY_NORMALIZED = new Set(
  BUSINESS.freeDeliveryAreas.map((area) => area.toLowerCase()),
);
