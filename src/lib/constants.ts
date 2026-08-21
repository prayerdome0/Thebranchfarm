import type {
  AnimalHealthStatus,
  AnimalStatus,
  AnimalType,
  HealthRecordType,
  FulfillmentMethod,
  OrderStatus,
  PaymentStatus,
  ProductKind,
} from "@/types";

export const BUSINESS = {
  name: "The Branch Farm",
  slogan: "Nayi Plug",
  established: 2026,
  location: "GG67+P95 Mahlabane, Eswatini",
  phoneDisplay: "+268 79777668",
  phoneLink: "+26879777668",
  whatsappDisplay: "+268 76581804",
  whatsappLink: "26876581804",
  currency: "E",
} as const;

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export const ANIMAL_TYPES: SelectOption<AnimalType>[] = [
  { value: "cattle", label: "Cattle" },
  { value: "pig", label: "Pig" },
  { value: "chicken", label: "Chicken / flock" },
  { value: "goat", label: "Goat" },
  { value: "sheep", label: "Sheep" },
  { value: "other", label: "Other" },
];

export const ANIMAL_STATUSES: SelectOption<AnimalStatus>[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "deceased", label: "Deceased" },
  { value: "transferred", label: "Transferred" },
];

export const HEALTH_STATUSES: SelectOption<AnimalHealthStatus>[] = [
  { value: "healthy", label: "Healthy" },
  { value: "under-observation", label: "Under observation" },
  { value: "sick", label: "Sick" },
  { value: "injured", label: "Injured" },
  { value: "recovering", label: "Recovering" },
];

export const HEALTH_RECORD_TYPES: SelectOption<HealthRecordType>[] = [
  { value: "observation", label: "Observation" },
  { value: "problem", label: "Problem" },
  { value: "vaccination", label: "Vaccination" },
  { value: "treatment", label: "Treatment" },
  { value: "examination", label: "Examination" },
  { value: "other", label: "Other" },
];

export const ACTIVITY_TYPES = [
  "Feeding",
  "Cleaning",
  "Vaccination",
  "Animal inspection",
  "Milk collection",
  "Egg collection",
  "Stock arrival",
  "Stock usage",
  "Repairs",
  "General activity",
] as const;

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  pdf: "PDF",
  image: "Image",
  word: "Word document",
  excel: "Spreadsheet",
  video: "Video",
  other: "Other file",
};

/* --------------------------- Business documents --------------------------- */

export const DOCUMENT_TYPES = [
  { value: "general", label: "General farm document" },
  { value: "quotation", label: "Quotation" },
  { value: "receipt", label: "Receipt" },
  { value: "invoice", label: "Invoice" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = DOCUMENT_TYPES.reduce(
  (acc, type) => {
    acc[type.value] = type.label;
    return acc;
  },
  {} as Record<string, string>,
);

/* ------------------------------- Cloudinary ------------------------------- */

/**
 * Cloudinary unsigned uploads for all farm media and downloadable files.
 * The upload preset below must exist in the farm's Cloudinary account as an
 * UNSIGNED preset. The cloud name comes from settings or NEXT_PUBLIC_* env.
 */
export const CLOUDINARY = {
  uploadPreset: "branch_farm",
  cloudNameEnv: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  /** Folders keep every uploaded asset organised in one Cloudinary library. */
  folders: {
    animals: "branch_farm/animals",
    health: "branch_farm/health",
    documents: "branch_farm/documents",
    products: "branch_farm/products",
    quotations: "branch_farm/quotations",
    receipts: "branch_farm/receipts",
    invoices: "branch_farm/invoices",
    videos: "branch_farm/videos",
    videoPosters: "branch_farm/video-posters",
  } as Record<string, string>,
} as const;

function toLabels<T extends string>(options: SelectOption<T>[]): Record<T, string> {
  return options.reduce(
    (acc, option) => {
      acc[option.value] = option.label;
      return acc;
    },
    {} as Record<T, string>,
  );
}

export const ANIMAL_TYPE_LABELS = toLabels(ANIMAL_TYPES);
export const ANIMAL_STATUS_LABELS = toLabels(ANIMAL_STATUSES);
export const HEALTH_STATUS_LABELS = toLabels(HEALTH_STATUSES);
export const HEALTH_RECORD_TYPE_LABELS = toLabels(HEALTH_RECORD_TYPES);

/* ------------------------------ Storefront ------------------------------ */

export interface ProductCategory {
  value: string;
  label: string;
  kind: ProductKind;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: "eggs", label: "Eggs", kind: "produce" },
  { value: "dairy", label: "Milk & dairy", kind: "produce" },
  { value: "vegetables", label: "Vegetables", kind: "produce" },
  { value: "meat", label: "Meat", kind: "produce" },
  { value: "cattle", label: "Cattle", kind: "livestock" },
  { value: "pigs", label: "Pigs", kind: "livestock" },
  { value: "goats", label: "Goats", kind: "livestock" },
  { value: "sheep", label: "Sheep", kind: "livestock" },
  { value: "poultry", label: "Poultry", kind: "livestock" },
  { value: "other", label: "Other", kind: "produce" },
];

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = PRODUCT_CATEGORIES.reduce(
  (acc, category) => {
    acc[category.value] = category.label;
    return acc;
  },
  {} as Record<string, string>,
);

export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  produce: "Farm produce",
  livestock: "Live animals",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready",
  "completed",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  processing: "Processing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
};

export const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  pickup: "Pickup at the farm",
  delivery: "Delivery",
};

export const PAYMENT_METHODS = [
  "Cash on collection / delivery",
  "EFT / bank transfer",
  "MTN MoMo",
  "E-Mali",
] as const;

export const STORE = {
  currency: "E",
  deliveryFee: 30,
  freeDeliveryThreshold: 500,
  promoCode: "",
  promoDiscountPercent: 0,
} as const;

export const VIDEO_CATEGORIES = [
  "Farm tour",
  "Livestock",
  "Produce",
  "Daily life",
  "How we work",
  "Other",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  ...ANIMAL_TYPE_LABELS,
  ...ANIMAL_STATUS_LABELS,
  ...HEALTH_STATUS_LABELS,
  ...HEALTH_RECORD_TYPE_LABELS,
  ...DOCUMENT_CATEGORY_LABELS,
  active: "Active",
  healthy: "Healthy",
  "under-observation": "Under observation",
  sick: "Sick",
  injured: "Injured",
  recovering: "Recovering",
  sold: "Sold",
  deceased: "Deceased",
  transferred: "Transferred",
  admin: "Administrator",
  staff: "Staff",
  user: "Pending approval",
  disabled: "Disabled",
  ...ORDER_STATUS_LABELS,
  ...PAYMENT_STATUS_LABELS,
  ...FULFILLMENT_LABELS,
};
