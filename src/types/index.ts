export type AppRole = "user" | "staff" | "admin";
export type AccountStatus = "active" | "disabled";
export type ProductCategory = "dairy" | "eggs" | "beef" | "pork" | "chicken" | "other";
export type ProductAvailability = "available" | "coming-soon" | "unavailable";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type TimestampValue = Date | string | { seconds: number; nanoseconds?: number } | null;

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  photoURL?: string;
  role: AppRole;
  status: AccountStatus;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
  lastLoginAt?: TimestampValue;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  description: string;
  longDescription?: string;
  price: number;
  unit: string;
  priceLabel?: string;
  availability: ProductAvailability;
  stock?: number | null;
  trackStock?: boolean;
  images: string[];
  location?: string;
  featured?: boolean;
  createdAt?: TimestampValue;
  updatedAt?: TimestampValue;
}

export interface FarmVideo {
  id: string;
  title: string;
  description: string;
  category: string;
  src: string;
  poster: string;
  credit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  image?: string;
  price: number;
  quantity: number;
  unit: string;
  subtotal: number;
}

export interface OrderCustomer {
  userId?: string | null;
  fullName: string;
  phone: string;
  whatsappAvailable: boolean;
  email?: string;
}

export interface OrderDelivery {
  address: string;
  location: string;
  instructions?: string;
  fee: number | null;
  label: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: OrderCustomer;
  delivery: OrderDelivery;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number | null;
  total: number;
  status: OrderStatus;
  agreementAccepted: boolean;
  signature?: string;
  signatureHash?: string;
  documentVersion: number;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
  statusHistory?: Array<{ status: OrderStatus; at: TimestampValue; by?: string }>;
}

export interface CheckoutPayload {
  items: Array<{ productId: string; quantity: number }>;
  customer: Omit<OrderCustomer, "userId">;
  delivery: Omit<OrderDelivery, "fee" | "label">;
  agreementAccepted: boolean;
  signature: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  audience?: "admin" | "staff" | "customer";
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: TimestampValue;
}

export interface FarmRecordBase {
  id: string;
  createdBy: string;
  createdAt: TimestampValue;
  updatedBy: string;
  updatedAt: TimestampValue;
  archived?: boolean;
}

export interface Animal extends FarmRecordBase {
  animalId: string;
  tagNumber: string;
  name?: string;
  species: "cattle" | "pig" | "chicken";
  breed: string;
  sex: "male" | "female" | "mixed";
  dateOfBirth?: string;
  photo?: string;
  weight?: number;
  healthStatus: "healthy" | "sick" | "injured" | "recovering";
  location: string;
  currentStatus: "active" | "sold" | "deceased" | "transferred";
  notes?: string;
}

export interface MilkProduction extends FarmRecordBase {
  date: string;
  morningProduction: number;
  eveningProduction: number;
  totalProduction: number;
  sold: number;
  remaining: number;
  wasted: number;
  price: number;
}

export interface EggProduction extends FarmRecordBase {
  date: string;
  eggsCollected: number;
  eggsSold: number;
  eggsDamaged: number;
  eggsRemaining: number;
  price: number;
}

export interface InventoryItem extends FarmRecordBase {
  product: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  location?: string;
}

export type DocumentType = "quotation" | "invoice" | "receipt" | "agreement";

export interface BusinessDocument {
  id: string;
  documentNumber: string;
  type: DocumentType;
  customer: Pick<OrderCustomer, "fullName" | "phone" | "email">;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number | null;
  total: number;
  status: "draft" | "sent" | "paid" | "overdue" | "archived";
  orderNumber?: string;
  paymentMethod?: string;
  paymentReference?: string;
  verificationCode: string;
  version: number;
  signature?: string;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
}

export interface VerificationRecord {
  id: string;
  code: string;
  documentType: DocumentType;
  documentNumber: string;
  orderNumber?: string;
  customerName: string;
  total: number;
  status: string;
  issuedBy: string;
  issuedAt: TimestampValue;
  active: boolean;
}
