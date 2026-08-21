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
}

export type AnimalType = "cattle" | "pig" | "chicken" | "goat" | "sheep" | "other";
export type AnimalSex = "male" | "female";
export type AnimalStatus = "active" | "sold" | "deceased" | "transferred";
export type AnimalHealthStatus =
  | "healthy"
  | "under-observation"
  | "sick"
  | "injured"
  | "recovering";

/**
 * Every farm record carries the who + when of its creation and last update so
 * the system can always answer "recorded by X on Y".
 */
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
  /** Public download URL of the uploaded photograph (Firebase Storage). */
  photo?: string;
  /** Storage path used to delete/replace the photograph. */
  photoPath?: string;
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
  /** Short headline, e.g. "Animal not eating normally". */
  problem: string;
  observation?: string;
  actionTaken?: string;
  medication?: string;
  /** Date of the event / examination, yyyy-mm-dd. */
  date: string;
  nextDate?: string;
  notes?: string;
  photo?: string;
  photoPath?: string;
}

export interface FarmDocument extends FarmRecordBase {
  name: string;
  description?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  /** pdf | image | word | excel | video | other */
  category: string;
  downloadUrl: string;
  storagePath: string;
  relatedAnimalId?: string;
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
  phone: string;
  whatsapp: string;
  email: string;
  currency: string;
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
export type PaymentStatus = "unpaid" | "paid";

export interface Product {
  id: string;
  name: string;
  /** produce | livestock */
  kind: ProductKind;
  category: string;
  description: string;
  price: number;
  /** Human unit label, e.g. "dozen", "kg", "litre", "each". */
  unit: string;
  stock: number;
  /** When true, stock is decremented on orders and shown to customers. */
  trackInventory: boolean;
  image?: string;
  imagePath?: string;
  active: boolean;
  featured?: boolean;
  createdBy?: string;
  createdByName?: string;
  createdAt?: TimestampValue;
  updatedAt?: TimestampValue;
  archived?: boolean;
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
  deliveryAddress?: string;
  notes?: string;
  paymentMethod?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: TimestampValue;
  updatedAt?: TimestampValue;
  updatedBy?: string;
  updatedByName?: string;
}
