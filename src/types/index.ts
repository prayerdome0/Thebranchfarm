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
  /** Explicit area permissions, e.g. ["Orders", "Products"]. Admins get all. */
  permissions?: string[];
  createdBy?: string;
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

export type AnimalRegistrationType = "born" | "purchased" | "transferred-in" | "existing";

export interface Animal extends FarmRecordBase {
  animalId: string;
  tagNumber?: string;
  name?: string;
  animalType: AnimalType;
  breed: string;
  sex: AnimalSex;
  dateOfBirth?: string;
  estimatedAge?: string;
  colour?: string;
  identifyingFeatures?: string;
  registrationType?: AnimalRegistrationType;
  datePurchased?: string;
  acquisitionDate?: string;
  purchasePrice?: number | null;
  supplier?: string;
  sellerContact?: string;
  purchasedFor?: string;
  transportInformation?: string;
  location: string;
  weight?: number | null;
  motherId?: string;
  fatherId?: string;
  offspringIds?: string[];
  status: AnimalStatus;
  healthStatus: AnimalHealthStatus;
  statusDate?: string;
  statusReason?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
  documents?: OperationAttachment[];
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
  symptoms?: string;
  reason?: string;
  actionTaken?: string;
  treatment?: string;
  medication?: string;
  vaccineName?: string;
  dosage?: string;
  veterinaryVisit?: boolean;
  vetName?: string;
  vetContact?: string;
  healthStatus?: AnimalHealthStatus;
  followUp?: string;
  date: string;
  nextDate?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
  attachmentUrl?: string;
  attachmentPublicId?: string;
  attachments?: OperationAttachment[];
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

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "converted";

export interface QuotationLine {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface Quotation extends FarmRecordBase {
  quotationNumber: string;
  customer: string;
  customerPhone?: string;
  customerEmail?: string;
  /** Link to the `customers` collection when the customer is on file. */
  customerId?: string;
  date: string;
  items: QuotationLine[];
  subtotal: number;
  discount?: number;
  /** Tax rate in percent, e.g. 15. */
  taxRate?: number;
  /** Computed tax amount. */
  taxAmount?: number;
  deliveryFee?: number;
  total: number;
  /** Total minus amount paid (equal to total while unpaid). */
  balance?: number;
  notes?: string;
  /** Legacy quotations may lack a status — treat them as drafts. */
  status?: QuotationStatus;
  /** Name of the staff member who prepared the quotation. */
  authorizedBy?: string;
  /** PNG data-URL signature captured on the device. */
  signature?: string;
  signedByName?: string;
  signedAt?: string;
  validUntil?: string;
  /** Set once the quotation has been converted into a receipt. */
  convertedReceiptId?: string;
  convertedReceiptNumber?: string;
  convertedOrderNumber?: string;
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
  /** Name of the staff member who prepared the invoice. */
  preparedBy?: string;
  /** Name of the staff member who authorized the invoice. */
  authorizedBy?: string;
  /** PNG data-URL signature captured on the device. */
  signature?: string;
  signedByName?: string;
  signedAt?: string;
  fileUrl?: string;
  publicId?: string;
  relatedOrderId?: string;
}

export interface Receipt extends FarmRecordBase {
  receiptNumber: string;
  /** Linked storefront order reference (may be empty for walk-in receipts). */
  orderNumber: string;
  customer: string;
  customerPhone?: string;
  customerEmail?: string;
  /** Link to the `customers` collection when the customer is on file. */
  customerId?: string;
  date: string;
  /** Line items for full receipts; legacy simple receipts may lack these. */
  items?: QuotationLine[];
  subtotal?: number;
  discount?: number;
  /** Tax rate in percent, e.g. 15. */
  taxRate?: number;
  /** Computed tax amount. */
  taxAmount?: number;
  /** Grand total; for legacy receipts it equals the paid amount. */
  total?: number;
  /** Amount paid (kept on the legacy `amount` field as well). */
  amount: number;
  amountPaid?: number;
  /** Total minus amount paid. */
  balance?: number;
  paymentMethod: string;
  description?: string;
  notes?: string;
  /** Name of the staff member who issued the receipt. */
  authorizedBy?: string;
  /** PNG data-URL signature captured on the device. */
  signature?: string;
  signedByName?: string;
  signedAt?: string;
  /** Present when the receipt was converted from a quotation. */
  quotationNumber?: string;
  quotationId?: string;
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
  feedingCompleted?: boolean;
  cleaningCompleted?: boolean;
  animalsChecked?: boolean;
  problemsNoticed?: string;
  attachments?: OperationAttachment[];
}

/* -------------------------- Farm operations -------------------------- */

export type FarmModule =
  | "weight"
  | "breeding"
  | "birth"
  | "acquisition"
  | "movement"
  | "feed"
  | "inventory"
  | "milk"
  | "eggs"
  | "daily-log"
  | "incident"
  | "task"
  | "equipment"
  | "maintenance"
  | "expense";

export type OperationValue = string | number | boolean | null;
export type OperationValues = Record<string, OperationValue>;
export type OperationPriority = "low" | "medium" | "high" | "critical";
export type ReviewStatus = "not-required" | "pending" | "approved" | "rejected";

export interface OperationAttachment {
  name: string;
  url: string;
  publicId: string;
  resourceType: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

/**
 * Shared, strongly-audited envelope used by all operational modules. Module
 * specific information lives in `values`; the field definitions are kept in
 * `farmModules.ts`, allowing reports and forms to use the same labels.
 */
export interface FarmOperationRecord extends FarmRecordBase {
  module: FarmModule;
  reference: string;
  title: string;
  date: string;
  summary?: string;
  status: string;
  priority?: OperationPriority;
  animalId?: string;
  animalLabel?: string;
  relatedAnimalIds?: string[];
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  values: OperationValues;
  attachments?: OperationAttachment[];
  reviewStatus: ReviewStatus;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: TimestampValue;
  reviewNote?: string;
}

export type AuditAction =
  | "created"
  | "updated"
  | "approved"
  | "rejected"
  | "archived"
  | "deleted"
  | "status-changed";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  module?: FarmModule;
  description: string;
  changes?: Record<string, { before?: OperationValue; after?: OperationValue }>;
  createdBy: string;
  createdByName: string;
  createdAt: TimestampValue;
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
  /** Optional short clip shown on the product card and product page. */
  videoUrl?: string;
  videoPath?: string;
  videoPosterUrl?: string;
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
