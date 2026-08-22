export type AppRole = "user" | "staff" | "admin";
export type AccountStatus = "active" | "disabled";

export type TimestampValue = Date | string | { seconds: number; nanoseconds?: number } | null;

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  title?: string;
  role: AppRole;
  status: AccountStatus;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
  lastLoginAt?: TimestampValue;
  permissions?: string[];
}

export type AnimalType = "cattle" | "pig" | "chicken" | "goat" | "sheep" | "other";
export type AnimalSex = "male" | "female";
export type AnimalStatus = "active" | "sold" | "deceased" | "transferred" | "other";
export type AnimalHealthStatus =
  | "healthy"
  | "under-observation"
  | "sick"
  | "injured"
  | "recovering";

export interface FarmRecordBase {
  id: string;
  createdBy: string;
  createdByName: string;
  createdAt: TimestampValue;
  updatedBy: string;
  updatedByName: string;
  updatedAt: TimestampValue;
  archived?: boolean;
}

export interface Animal extends FarmRecordBase {
  animalId: string;
  tagNumber?: string;
  name?: string;
  animalType: AnimalType;
  breed: string;
  sex: AnimalSex;
  dateOfBirth?: string;
  datePurchased?: string;
  purchasePrice?: number | null;
  supplier?: string;
  location: string;
  weight?: number | null;
  status: AnimalStatus;
  healthStatus: AnimalHealthStatus;
  notes?: string;
  photo?: string;
  photoPath?: string;
  // Extra fields for file record tracking
  fileUrl?: string;
  publicId?: string;
}

export type HealthRecordType =
  | "observation"
  | "problem"
  | "vaccination"
  | "treatment"
  | "examination"
  | "other";

export interface HealthRecord extends FarmRecordBase {
  animalId: string;
  animalLabel?: string;
  type: HealthRecordType;
  problem: string;
  description?: string;
  observation?: string;
  actionTaken?: string;
  treatment?: string;
  medication?: string;
  date: string;
  nextDate?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  fileUrl?: string;
  publicId?: string;
}

export interface FileRecord {
  fileUrl: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  displayName: string;
  fileType: string;
  recordType: string;
  recordId: string;
  uploadedBy: string;
  uploadedAt: TimestampValue;
}

export interface FarmDocument extends FarmRecordBase {
  documentNumber?: string;
  name: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  docType?: string;
  downloadUrl: string;
  storagePath: string;
  cloudinaryPublicId?: string;
  relatedAnimalId?: string;
  relatedOrderId?: string;
  relatedCustomer?: string;
  relatedSupplier?: string;
  amount?: number;
  // File record structure
  fileUrl?: string;
  publicId?: string;
  resourceType?: string;
  displayName?: string;
  recordType?: string;
  recordId?: string;
  uploadedBy?: string;
  uploadedAt?: TimestampValue;
  // Extended for quotations/invoices/receipts
  type?: string;
  date?: string;
  customer?: string;
}

export interface Quotation extends FarmRecordBase {
  quotationNumber: string;
  customer: string;
  customerPhone?: string;
  customerEmail?: string;
  date: string;
  items: { name: string; quantity: number; price: number; unit?: string }[];
  subtotal: number;
  discount?: number;
  total: number;
  notes?: string;
  status?: string;
  fileUrl?: string;
  publicId?: string;
}

export interface Invoice extends FarmRecordBase {
  invoiceNumber: string;
  customer: string;
  date: string;
  items: { name: string; quantity: number; price: number; unit?: string }[];
  subtotal: number;
  discount?: number;
  delivery?: number;
  total: number;
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid" | "Cancelled";
  notes?: string;
  fileUrl?: string;
  publicId?: string;
  relatedOrderId?: string;
}

export interface Receipt extends FarmRecordBase {
  receiptNumber: string;
  orderNumber: string;
  customer: string;
  date: string;
  amount: number;
  paymentMethod: string;
  description?: string;
  fileUrl?: string;
  publicId?: string;
  relatedOrderId?: string;
}

export interface Customer extends FarmRecordBase {
  name: string;
  phone: string;
  email?: string;
  orders?: number;
  totalSpent?: number;
  lastOrder?: TimestampValue;
  deliveryLocation?: string;
  address?: string;
  status?: "active" | "inactive";
  dateRegistered?: TimestampValue;
  orderIds?: string[];
}

export interface FarmMedia extends FarmRecordBase {
  title?: string;
  caption?: string;
  description?: string;
  fileUrl: string;
  publicId: string;
  resourceType: "image" | "video";
  type: "photo" | "video";
  featured?: boolean;
  published?: boolean;
  thumbnailUrl?: string;
  thumbnailPublicId?: string;
}

export interface ActivityRecord extends FarmRecordBase {
  activity: string;
  date: string;
  time?: string;
  location?: string;
  notes: string;
  animalId?: string;
}

export interface FarmSettings {
  farmName: string;
  slogan: string;
  location: string;
  fullLocation?: string;
  phone: string;
  whatsapp: string;
  email: string;
  currency: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  deliveryInfo?: string;
  deliveryFree?: string;
  deliveryOther?: string;
  promoCode?: string;
  promoDiscountPercent?: number;
  heroProductId?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  businessInfo?: string;
  updatedAt?: TimestampValue;
  updatedBy?: string;
  updatedByName?: string;
}

/* ------------------------------ Storefront ------------------------------ */

export type ProductKind = "produce" | "livestock";
export type FulfillmentMethod = "pickup" | "delivery";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready"
  | "completed"
  | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "partial";

export interface Product {
  id: string;
  name: string;
  kind: ProductKind;
  category: string;
  description: string;
  shortDescription?: string;
  price: number;
  salePrice?: number | null;
  unit: string;
  stock: number;
  trackInventory: boolean;
  allowBackorder?: boolean;
  comingSoon?: boolean;
  image?: string;
  imagePath?: string;
  images?: string[];
  imagePaths?: string[];
  active: boolean;
  published?: boolean;
  featured?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: TimestampValue;
  updatedAt?: TimestampValue;
  archived?: boolean;
  fileUrl?: string;
  publicId?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface Order {
  id: string;
  reference: string;
  orderNumber?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  fulfillment: FulfillmentMethod;
  deliveryLocation?: string;
  deliveryAddress?: string;
  notes?: string;
  paymentMethod?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: TimestampValue;
  updatedAt?: TimestampValue;
  updatedBy?: string;
  updatedByName?: string;
  signature?: string;
  signedByName?: string;
  signedAt?: TimestampValue;
}

export interface FarmVideo {
  id: string;
  title: string;
  description?: string;
  caption?: string;
  category: string;
  videoUrl: string;
  storagePath: string;
  fileUrl?: string;
  publicId?: string;
  posterUrl?: string;
  posterPath?: string;
  thumbnailUrl?: string;
  featured?: boolean;
  published?: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: TimestampValue;
  archived?: boolean;
}
