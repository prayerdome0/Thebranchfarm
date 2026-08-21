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
import { BUSINESS } from "@/lib/constants";
import { deleteStorageObject } from "./storage";
import { DEMO_PRODUCTS, demoOrders, generateOrderReference } from "@/lib/store";
import type {
  ActivityRecord,
  Animal,
  FarmDocument,
  FarmSettings,
  HealthRecord,
  Order,
  OrderItem,
  Product,
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
  const current = requireUser();
  const name = current.displayName || "Team member";
  return {
    createdBy: current.uid,
    createdByName: name,
    updatedBy: current.uid,
    updatedByName: name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archived: false,
  };
}

function updateStamp() {
  const current = requireUser();
  return {
    updatedBy: current.uid,
    updatedByName: current.displayName || "Team member",
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
  if (animal?.photoPath) deletions.push(deleteStorageObject(animal.photoPath).catch(() => {}));
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
  if (data?.storagePath) await deleteStorageObject(data.storagePath).catch(() => {});
  return deleteDoc(doc(db, "farmDocuments", id));
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
    phone: BUSINESS.phoneDisplay,
    whatsapp: BUSINESS.whatsappDisplay,
    email: "",
    currency: BUSINESS.currency,
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

/** Active catalogue. Falls back to the sample catalog when Firestore is unreachable. */
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

/** Admin view: all products, including inactive ones. */
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
  if (data?.imagePath) await deleteStorageObject(data.imagePath).catch(() => {});
  return deleteDoc(doc(db, "products", id));
}

/** Seeds the sample catalog into Firestore (admin convenience action). */
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
    const ref = await addDoc(collection(db, "orders"), order);

    // Best-effort stock decrement for inventory-tracked products.
    for (const item of values.items) {
      if (!item.productId || item.productId.startsWith("demo-")) continue;
      updateDoc(doc(db, "products", item.productId), {
        stock: increment(-item.quantity),
      }).catch(() => {});
    }

    return { ...order, id: ref.id };
  } catch {
    const fallback: Order = {
      ...order,
      id: `local-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return demoOrders.add(fallback);
  }
}

/** Admin list of all orders. Falls back to local demo orders. */
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
  patch: Partial<Pick<Order, "status" | "paymentStatus" | "notes">>,
) {
  try {
    await updateDoc(doc(db, "orders", id), { ...patch, ...updateStamp() });
    return true;
  } catch {
    demoOrders.update(id, { ...patch, updatedAt: new Date() });
    return true;
  }
}

/* ------------------------------ Helpers ------------------------------ */

export function animalLabel(animal: Animal | null | undefined, fallback = "") {
  if (!animal) return fallback;
  const typeLabel = animal.animalType.charAt(0).toUpperCase() + animal.animalType.slice(1);
  return [typeLabel, animal.animalId, animal.name].filter(Boolean).join(" · ");
}
