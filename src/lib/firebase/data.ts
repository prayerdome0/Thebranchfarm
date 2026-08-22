import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./config";
import { BUSINESS, CLOUDINARY, STORE } from "@/lib/constants";
import { deleteStorageObject } from "./storage";
import { DEMO_PRODUCTS, DEMO_VIDEOS, demoOrders, generateOrderReference } from "@/lib/store";
import type {
  ActivityRecord,
  Animal,
  Customer,
  FarmDocument,
  FarmMedia,
  FarmSettings,
  FarmVideo,
  HealthRecord,
  Invoice,
  Order,
  OrderItem,
  Product,
  Quotation,
  Receipt,
  UserProfile,
} from "@/types";

function mapped<T>(snapshot: { id: string; data: () => DocumentData }) {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

function requireUser() {
  const current = auth.currentUser;
  if (!current) throw new Error("unauthenticated");
  return current;
}

function stamp() {
  const current = auth.currentUser;
  const uid = current?.uid || "system";
  const name = current?.displayName || current?.email || "Team member";
  return {
    createdBy: uid,
    createdByName: name,
    updatedBy: uid,
    updatedByName: name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };
}

function updateStamp() {
  const current = auth.currentUser;
  const uid = current?.uid || "system";
  return {
    updatedBy: uid,
    updatedByName: current?.displayName || current?.email || "Team member",
    updatedAt: serverTimestamp(),
  };
}

/* ----------------------------- Animals ----------------------------- */

export function animalCollection() {
  return query(collection(db, "animals"), orderBy("createdAt", "desc"), limit(500));
}

export async function getAnimals(): Promise<Animal[]> {
  try {
    const snapshot = await getDocs(animalCollection());
    return snapshot.docs.map((item) => mapped<Animal>(item));
  } catch {
    return [];
  }
}

export function watchAnimals(callback: (animals: Animal[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      animalCollection(),
      (snapshot) => callback(snapshot.docs.map((item) => mapped<Animal>(item))),
      () => callback([]),
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export async function getAnimal(id: string): Promise<Animal | null> {
  try {
    const snapshot = await getDoc(doc(db, "animals", id));
    return snapshot.exists() ? mapped<Animal>(snapshot) : null;
  } catch {
    return null;
  }
}

export function watchAnimal(id: string, callback: (animal: Animal | null) => void): Unsubscribe {
  try {
    return onSnapshot(
      doc(db, "animals", id),
      (snapshot) => callback(snapshot.exists() ? mapped<Animal>(snapshot) : null),
      () => callback(null),
    );
  } catch {
    callback(null);
    return () => {};
  }
}

export async function createAnimal(values: Omit<Animal, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "animals"), { ...values, ...stamp() });
}

export async function updateAnimal(id: string, values: Omit<Animal, "id">) {
  return setDoc(doc(db, "animals", id), { ...values, ...updateStamp() });
}

export async function deleteAnimal(id: string) {
  const [health, animal] = await Promise.all([getHealthRecords(id), getAnimal(id)]);
  const deletions: Promise<unknown>[] = [
    ...health.map((record) => deleteDoc(doc(db, "animalHealth", record.id))),
    deleteDoc(doc(db, "animals", id)),
  ];
  if (animal?.photoPath && !animal.photoPath.startsWith("cloudinary:")) deletions.push(deleteStorageObject(animal.photoPath).catch(() => {}));
  await Promise.all(deletions);
}

/* --------------------------- Health records -------------------------- */

export async function getHealthRecords(animalId?: string): Promise<HealthRecord[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "animalHealth"), orderBy("createdAt", "desc"), limit(1000)),
    );
    const records = snapshot.docs.map((item) => mapped<HealthRecord>(item));
    return animalId ? records.filter((record) => record.animalId === animalId) : records;
  } catch {
    return [];
  }
}

export function watchHealthRecords(
  animalId: string | null,
  callback: (records: HealthRecord[]) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "animalHealth"), orderBy("createdAt", "desc"), limit(1000)),
      (snapshot) => {
        const records = snapshot.docs.map((item) => mapped<HealthRecord>(item));
        callback(animalId ? records.filter((record) => record.animalId === animalId) : records);
      },
      () => callback([]),
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export async function addHealthRecord(values: Omit<HealthRecord, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "animalHealth"), { ...values, ...stamp() });
}

export async function updateHealthRecord(id: string, values: Omit<HealthRecord, "id">) {
  return setDoc(doc(db, "animalHealth", id), { ...values, ...updateStamp() });
}

export async function deleteHealthRecord(id: string) {
  return deleteDoc(doc(db, "animalHealth", id));
}

/* ------------------------------- Staff ------------------------------- */

export async function getUsers(): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "users"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs.map((item) => mapped<UserProfile>(item));
  } catch {
    return [];
  }
}

export async function setUserRole(uid: string, role: UserProfile["role"]) {
  const callable = httpsCallable<{ uid: string; role: UserProfile["role"] }, { ok: boolean }>(
    functions,
    "setUserRole",
  );
  await callable({ uid, role });
}

export async function setUserStatus(uid: string, status: UserProfile["status"]) {
  const callable = httpsCallable<{ uid: string; status: UserProfile["status"] }, { ok: boolean }>(
    functions,
    "setUserStatus",
  );
  await callable({ uid, status });
}

export async function createStaffAccount(values: {
  fullName: string;
  email: string;
  phone: string;
  title?: string;
  role: "staff" | "admin";
}) {
  const callable = httpsCallable<typeof values, { uid: string; tempPassword: string }>(
    functions,
    "createStaffAccount",
  );
  const result = await callable(values);
  return result.data;
}

/* ----------------------------- Documents ----------------------------- */

export async function getFarmDocuments(): Promise<FarmDocument[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "farmDocuments"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs.map((item) => mapped<FarmDocument>(item));
  } catch {
    return [];
  }
}

export async function createFarmDocument(values: Omit<FarmDocument, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "farmDocuments"), { ...values, ...stamp() });
}

export async function deleteFarmDocument(id: string) {
  const snapshot = await getDoc(doc(db, "farmDocuments", id));
  const data = snapshot.exists() ? (snapshot.data() as FarmDocument) : null;
  if (data?.storagePath && !data.storagePath.startsWith("cloudinary:")) await deleteStorageObject(data.storagePath).catch(() => {});
  return deleteDoc(doc(db, "farmDocuments", id));
}

/* ----------------------------- Quotations ----------------------------- */

export async function getQuotations(): Promise<Quotation[]> {
  try {
    const snap = await getDocs(query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => mapped<Quotation>(d));
  } catch {
    return [];
  }
}
export function watchQuotations(cb: (list: Quotation[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "quotations"), orderBy("createdAt", "desc"), limit(200)), (snap) => cb(snap.docs.map((d) => mapped<Quotation>(d))), () => cb([]));
  } catch {
    cb([]); return () => {};
  }
}
export async function createQuotation(values: Omit<Quotation, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "quotations"), { ...values, ...stamp() });
}

/* ----------------------------- Invoices ----------------------------- */

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const snap = await getDocs(query(collection(db, "invoices"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => mapped<Invoice>(d));
  } catch { return []; }
}
export function watchInvoices(cb: (list: Invoice[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "invoices"), orderBy("createdAt", "desc"), limit(200)), (snap) => cb(snap.docs.map((d) => mapped<Invoice>(d))), () => cb([]));
  } catch { cb([]); return () => {}; }
}
export async function createInvoice(values: Omit<Invoice, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "invoices"), { ...values, ...stamp() });
}

/* ----------------------------- Receipts ----------------------------- */

export async function getReceipts(): Promise<Receipt[]> {
  try {
    const snap = await getDocs(query(collection(db, "receipts"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => mapped<Receipt>(d));
  } catch { return []; }
}
export function watchReceipts(cb: (list: Receipt[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "receipts"), orderBy("createdAt", "desc"), limit(200)), (snap) => cb(snap.docs.map((d) => mapped<Receipt>(d))), () => cb([]));
  } catch { cb([]); return () => {}; }
}
export async function createReceipt(values: Omit<Receipt, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "receipts"), { ...values, ...stamp() });
}

/* ----------------------------- Customers ----------------------------- */

export async function getCustomers(): Promise<Customer[]> {
  try {
    const snap = await getDocs(query(collection(db, "customers"), orderBy("createdAt", "desc"), limit(500)));
    return snap.docs.map((d) => mapped<Customer>(d));
  } catch { return []; }
}

export function watchCustomers(cb: (list: Customer[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "customers"), orderBy("createdAt", "desc"), limit(500)), (snap) => cb(snap.docs.map((d) => mapped<Customer>(d))), () => cb([]));
  } catch { cb([]); return () => {}; }
}

export async function getCustomer(id: string): Promise<Customer | null> {
  try {
    const snap = await getDoc(doc(db, "customers", id));
    return snap.exists() ? mapped<Customer>(snap) : null;
  } catch { return null; }
}

export async function getCustomerByPhone(phone: string): Promise<Customer | null> {
  try {
    const snap = await getDocs(query(collection(db, "customers"), where("phone", "==", phone), limit(1)));
    const first = snap.docs[0];
    return first ? mapped<Customer>(first) : null;
  } catch { return null; }
}

export async function createOrUpdateCustomerFromOrder(order: Order) {
  try {
    const existing = await getCustomerByPhone(order.customer.phone);
    if (existing) {
      const totalSpent = (existing.totalSpent || 0) + order.total;
      await updateDoc(doc(db, "customers", existing.id), {
        name: order.customer.name,
        email: order.customer.email || existing.email,
        totalSpent,
        lastOrder: serverTimestamp(),
        deliveryLocation: order.deliveryAddress || order.deliveryLocation || existing.deliveryLocation,
        orders: increment(1),
        updatedAt: serverTimestamp(),
      });
      return existing.id;
    } else {
      const ref = await addDoc(collection(db, "customers"), {
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email || "",
        orders: 1,
        totalSpent: order.total,
        lastOrder: serverTimestamp(),
        deliveryLocation: order.deliveryAddress || order.deliveryLocation || "",
        status: "active",
        dateRegistered: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: "system",
        createdByName: "System",
        updatedBy: "system",
        updatedByName: "System",
      });
      return ref.id;
    }
  } catch {
    // ignore customer creation errors
    return null;
  }
}

/* ----------------------------- Farm Media ----------------------------- */

export async function getFarmMedia(): Promise<FarmMedia[]> {
  try {
    const snap = await getDocs(query(collection(db, "media"), orderBy("createdAt", "desc"), limit(500)));
    return snap.docs.map((d) => mapped<FarmMedia>(d));
  } catch { return []; }
}

export function watchFarmMedia(cb: (list: FarmMedia[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "media"), orderBy("createdAt", "desc"), limit(500)), (snap) => cb(snap.docs.map((d) => mapped<FarmMedia>(d))), () => cb([]));
  } catch { cb([]); return () => {}; }
}

export async function createFarmMedia(values: Omit<FarmMedia, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "media"), { ...values, ...stamp() });
}

export async function deleteFarmMedia(id: string) {
  return deleteDoc(doc(db, "media", id));
}

export async function updateFarmMedia(id: string, patch: Partial<FarmMedia>) {
  return updateDoc(doc(db, "media", id), { ...patch, ...updateStamp() });
}

/* ----------------------------- Activities ----------------------------- */

export async function getActivities(): Promise<ActivityRecord[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "farmActivities"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs.map((item) => mapped<ActivityRecord>(item));
  } catch {
    return [];
  }
}

export async function addActivity(values: Omit<ActivityRecord, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "farmActivities"), { ...values, ...stamp() });
}

export async function deleteActivity(id: string) {
  return deleteDoc(doc(db, "farmActivities", id));
}

/* ------------------------------ Settings ------------------------------ */

export function defaultSettings(): FarmSettings {
  return {
    farmName: BUSINESS.name,
    slogan: BUSINESS.slogan,
    location: BUSINESS.location,
    fullLocation: BUSINESS.fullLocation,
    phone: BUSINESS.phoneDisplay,
    whatsapp: BUSINESS.whatsappDisplay,
    email: BUSINESS.email,
    currency: BUSINESS.currency,
    deliveryFee: STORE.deliveryFee,
    freeDeliveryThreshold: STORE.freeDeliveryThreshold,
    deliveryInfo: `${BUSINESS.deliveryFree} ${BUSINESS.deliveryOther}`,
    deliveryFree: BUSINESS.deliveryFree,
    deliveryOther: BUSINESS.deliveryOther,
    promoCode: "",
    promoDiscountPercent: 0,
    heroProductId: "",
    cloudinaryCloudName: CLOUDINARY.cloudName,
    cloudinaryUploadPreset: CLOUDINARY.uploadPreset,
    businessInfo: `${BUSINESS.name} - ${BUSINESS.slogan} - Farm in ${BUSINESS.location}`,
  };
}

export async function getFarmSettings(): Promise<FarmSettings> {
  try {
    const snapshot = await getDoc(doc(db, "settings", "farm"));
    if (!snapshot.exists()) return defaultSettings();
    return { ...defaultSettings(), ...(snapshot.data() as Partial<FarmSettings>) };
  } catch {
    return defaultSettings();
  }
}

export async function saveFarmSettings(values: FarmSettings) {
  return setDoc(doc(db, "settings", "farm"), { ...values, ...updateStamp() });
}

/* ------------------------------ Storefront ------------------------------ */

function demoProducts(): Product[] {
  return DEMO_PRODUCTS.map((product, index) => ({ ...product, id: `demo-${index + 1}` }));
}

export async function getProducts(): Promise<Product[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "products"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs
      .map((item) => mapped<Product>(item))
      .filter((product) => product.active);
  } catch {
    return demoProducts();
  }
}

export function watchProducts(callback: (products: Product[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc"), limit(500)),
      (snapshot) =>
        callback(
          snapshot.docs
            .map((item) => mapped<Product>(item))
            .filter((product) => product.active),
        ),
      () => callback(demoProducts()),
    );
  } catch {
    callback(demoProducts());
    return () => {};
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "products"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs.map((item) => mapped<Product>(item));
  } catch {
    return demoProducts();
  }
}

export function watchAllProducts(callback: (products: Product[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "products"), orderBy("createdAt", "desc"), limit(500)),
      (snapshot) => callback(snapshot.docs.map((item) => mapped<Product>(item))),
      () => callback(demoProducts()),
    );
  } catch {
    callback(demoProducts());
    return () => {};
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  try {
    const snapshot = await getDoc(doc(db, "products", id));
    return snapshot.exists() ? mapped<Product>(snapshot) : null;
  } catch {
    return demoProducts().find((product) => product.id === id) || null;
  }
}

export async function createProduct(values: Omit<Product, "id">) {
  return addDoc(collection(db, "products"), { ...values, ...stamp() });
}

export async function updateProduct(id: string, values: Omit<Product, "id">) {
  return setDoc(doc(db, "products", id), { ...values, ...updateStamp() });
}

export async function deleteProduct(id: string) {
  const snapshot = await getDoc(doc(db, "products", id));
  const data = snapshot.exists() ? (snapshot.data() as Product) : null;
  if (data?.imagePath && !data.imagePath.startsWith("cloudinary:")) await deleteStorageObject(data.imagePath).catch(() => {});
  return deleteDoc(doc(db, "products", id));
}

export async function seedDemoProducts(): Promise<number> {
  const batch = writeBatch(db);
  const ref = collection(db, "products");
  DEMO_PRODUCTS.forEach((product) => {
    batch.set(doc(ref), { ...product, ...stamp() });
  });
  await batch.commit();
  return DEMO_PRODUCTS.length;
}

/* ------------------------------- Orders ------------------------------- */

export async function createOrder(values: {
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  customer: { name: string; phone: string; email?: string };
  fulfillment: Order["fulfillment"];
  deliveryAddress?: string;
  deliveryLocation?: string;
  notes?: string;
  paymentMethod?: string;
}): Promise<Order> {
  const order: Omit<Order, "id"> = {
    ...values,
    reference: generateOrderReference(),
    status: "pending" as const,
    paymentStatus: "unpaid" as const,
    createdAt: serverTimestamp() as unknown as Date,
    updatedAt: serverTimestamp() as unknown as Date,
  };

  try {
    const ref = await runTransaction(db, async (transaction) => {
      for (const item of values.items) {
        if (!item.productId || item.productId.startsWith("demo-")) continue;
        const productRef = doc(db, "products", item.productId);
        const snapshot = await transaction.get(productRef);
        if (!snapshot.exists()) continue;
        const product = snapshot.data() as Product;
        if (product.trackInventory && !product.allowBackorder) {
          const remaining = (product.stock ?? 0) - item.quantity;
          if (remaining < 0) {
            throw new Error(`insufficient-stock:${product.name}`);
          }
        }
        if (product.trackInventory) {
          transaction.update(productRef, { stock: increment(-item.quantity) });
        }
      }
      const orderRef = doc(collection(db, "orders"));
      transaction.set(orderRef, order);
      return orderRef;
    });

    const created: Order = { ...order, id: ref.id, createdAt: new Date(), updatedAt: new Date() } as Order;
    // Create customer record async (don't block)
    createOrUpdateCustomerFromOrder(created).catch(() => {});
    return { ...order, id: ref.id } as Order;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message.startsWith("insufficient-stock:")) {
      throw new Error(`Insufficient stock for "${message.slice("insufficient-stock:".length)}". Please reduce the quantity.`);
    }
    const fallback: Order = {
      ...order,
      id: `local-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    return demoOrders.add(fallback);
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500)),
    );
    return snapshot.docs.map((item) => mapped<Order>(item));
  } catch {
    return demoOrders.list();
  }
}

export function watchOrders(callback: (orders: Order[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500)),
      (snapshot) => callback(snapshot.docs.map((item) => mapped<Order>(item))),
      () => callback(demoOrders.list()),
    );
  } catch {
    callback(demoOrders.list());
    return () => {};
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  try {
    const snapshot = await getDoc(doc(db, "orders", id));
    return snapshot.exists() ? mapped<Order>(snapshot) : null;
  } catch {
    return demoOrders.get(id);
  }
}

export async function getOrderByReference(reference: string): Promise<Order | null> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "orders"), where("reference", "==", reference), limit(1)),
    );
    const first = snapshot.docs[0];
    return first ? mapped<Order>(first) : null;
  } catch {
    return demoOrders.get(reference);
  }
}

export async function updateOrder(
  id: string,
  patch: Partial<Pick<Order, "status" | "paymentStatus" | "notes" | "signature" | "signedByName" | "signedAt" | "deliveryAddress">>,
) {
  try {
    await updateDoc(doc(db, "orders", id), { ...patch, ...updateStamp() });
    return true;
  } catch {
    demoOrders.update(id, { ...patch, updatedAt: new Date() });
    return true;
  }
}

/* -------------------------------- Videos ------------------------------- */

function demoVideos(): FarmVideo[] {
  return DEMO_VIDEOS.map((video, index) => ({ ...video, id: `demo-video-${index + 1}` }));
}

export async function getVideos(): Promise<FarmVideo[]> {
  try {
    const snapshot = await getDocs(
      query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(200)),
    );
    const videos = snapshot.docs.map((item) => mapped<FarmVideo>(item));
    return videos.length ? videos : demoVideos();
  } catch {
    return demoVideos();
  }
}

export function watchVideos(callback: (videos: FarmVideo[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(200)),
      (snapshot) => {
        const videos = snapshot.docs.map((item) => mapped<FarmVideo>(item));
        callback(videos.length ? videos : demoVideos());
      },
      () => callback(demoVideos()),
    );
  } catch {
    callback(demoVideos());
    return () => {};
  }
}

export function watchManagedVideos(callback: (videos: FarmVideo[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(200)),
      (snapshot) => callback(snapshot.docs.map((item) => mapped<FarmVideo>(item))),
      () => callback([]),
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export async function createVideo(values: Omit<FarmVideo, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "videos"), { ...values, ...stamp() });
}

export async function seedDemoVideos(): Promise<number> {
  const batch = writeBatch(db);
  const ref = collection(db, "videos");
  DEMO_VIDEOS.forEach((video) => {
    batch.set(doc(ref), { ...video, ...stamp() });
  });
  await batch.commit();
  return DEMO_VIDEOS.length;
}

export async function deleteVideo(id: string) {
  const snapshot = await getDoc(doc(db, "videos", id));
  const data = snapshot.exists() ? (snapshot.data() as FarmVideo) : null;
  if (data?.storagePath && !data.storagePath.startsWith("cloudinary:")) await deleteStorageObject(data.storagePath).catch(() => {});
  if (data?.posterPath && !data.posterPath.startsWith("cloudinary:")) await deleteStorageObject(data.posterPath).catch(() => {});
  return deleteDoc(doc(db, "videos", id));
}

/* ------------------------------ Helpers ------------------------------ */

export function animalLabel(animal: Animal | null | undefined, fallback = "") {
  if (!animal) return fallback;
  const typeLabel = animal.animalType.charAt(0).toUpperCase() + animal.animalType.slice(1);
  return [typeLabel, animal.animalId, animal.name].filter(Boolean).join(" · ");
}
