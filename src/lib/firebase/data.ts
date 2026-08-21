import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./config";
import { INITIAL_PRODUCTS } from "@/lib/constants";
import type {
  CheckoutPayload,
  Order,
  Product,
  UserProfile,
  VerificationRecord,
} from "@/types";

function mapped<T>(snapshot: { id: string; data: () => DocumentData }) {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export async function getProducts(): Promise<Product[]> {
  const snapshot = await getDocs(query(collection(db, "products"), limit(100)));
  if (snapshot.empty) return INITIAL_PRODUCTS;
  return snapshot.docs.map((item) => mapped<Product>(item));
}

export function watchProducts(callback: (products: Product[]) => void): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "products"), limit(100)),
      (snapshot) => {
        try {
          callback(snapshot.empty ? INITIAL_PRODUCTS : snapshot.docs.map((item) => mapped<Product>(item)));
        } catch {
          callback(INITIAL_PRODUCTS);
        }
      },
      () => callback(INITIAL_PRODUCTS),
    );
  } catch {
    // Vercel preview without Firestore access — immediately fallback so page paints.
    callback(INITIAL_PRODUCTS);
    return () => {};
  }
}

export async function getProduct(id: string): Promise<Product | null> {
  const localProduct = INITIAL_PRODUCTS.find((item) => item.id === id || item.slug === id) || null;
  try {
    const snapshot = await getDoc(doc(db, "products", id));
    return snapshot.exists() ? mapped<Product>(snapshot) : localProduct;
  } catch {
    return localProduct;
  }
}

export async function createOrder(payload: CheckoutPayload): Promise<{
  orderNumber: string;
  id: string;
  total: number;
  deliveryLabel: string;
}> {
  const callable = httpsCallable<CheckoutPayload, {
    orderNumber: string;
    id: string;
    total: number;
    deliveryLabel: string;
  }>(functions, "createOrder");
  const result = await callable(payload);
  return result.data;
}

export async function trackOrder(orderNumber: string, phoneLast4?: string): Promise<Order | null> {
  const callable = httpsCallable<
    { orderNumber: string; phoneLast4?: string },
    { order: Order | null }
  >(functions, "trackOrder");
  const result = await callable({ orderNumber: orderNumber.toUpperCase().trim(), phoneLast4 });
  return result.data.order;
}

export async function getMyOrders(uid: string): Promise<Order[]> {
  const snapshot = await getDocs(
    query(collection(db, "orders"), where("customer.userId", "==", uid), orderBy("createdAt", "desc"), limit(50)),
  );
  return snapshot.docs.map((item) => mapped<Order>(item));
}

export async function getMyDocuments(uid: string) {
  const snapshot = await getDocs(
    query(collection(db, "documents"), where("customerId", "==", uid), orderBy("createdAt", "desc"), limit(50)),
  );
  return snapshot.docs.map((item) => mapped<import("@/types").BusinessDocument>(item));
}

export async function getStaffNotifications() {
  const snapshot = await getDocs(
    query(collection(db, "notifications"), where("audience", "==", "staff"), orderBy("createdAt", "desc"), limit(100)),
  );
  return snapshot.docs.map((item) => mapped<import("@/types").AppNotification>(item));
}

export async function getMyNotifications(uid: string) {
  const snapshot = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(50)),
  );
  return snapshot.docs.map((item) => mapped<import("@/types").AppNotification>(item));
}

export async function markNotificationRead(id: string) {
  return updateDoc(doc(db, "notifications", id), { read: true });
}

export async function getOperationalOrders(): Promise<Order[]> {
  const snapshot = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100)));
  return snapshot.docs.map((item) => mapped<Order>(item));
}

export async function updateOrderStatus(orderId: string, status: Order["status"]) {
  const callable = httpsCallable<{ orderId: string; status: Order["status"] }, { ok: boolean }>(
    functions,
    "updateOrderStatus",
  );
  await callable({ orderId, status });
}

export async function updateProfile(uid: string, values: Pick<UserProfile, "fullName" | "phone">) {
  await updateDoc(doc(db, "users", uid), { ...values, updatedAt: serverTimestamp() });
}

export async function getUsers(): Promise<UserProfile[]> {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(250)));
  return snapshot.docs.map((item) => mapped<UserProfile>(item));
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

export async function saveProduct(product: Product) {
  const callable = httpsCallable<Product, { ok: boolean }>(functions, "saveProduct");
  await callable(product);
}

export async function addFarmRecord(collectionName: string, values: Record<string, unknown>) {
  if (!auth.currentUser) throw new Error("unauthenticated");
  return addDoc(collection(db, collectionName), {
    ...values,
    createdBy: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    updatedBy: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
    archived: false,
  });
}

export async function archiveFarmRecord(collectionName: string, id: string) {
  if (!auth.currentUser) throw new Error("unauthenticated");
  return updateDoc(doc(db, collectionName, id), {
    archived: true,
    updatedBy: auth.currentUser.uid,
    updatedAt: serverTimestamp(),
  });
}

export async function getCollection<T>(collectionName: string, max = 100, sortField = "createdAt"): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db, collectionName), orderBy(sortField, "desc"), limit(max)));
  return snapshot.docs.map((item) => mapped<T>(item));
}

export async function getVerification(code: string): Promise<VerificationRecord | null> {
  const snapshot = await getDoc(doc(db, "documentVerifications", code.toUpperCase()));
  return snapshot.exists() ? mapped<VerificationRecord>(snapshot) : null;
}

export async function sendContactMessage(values: Record<string, string>) {
  return addDoc(collection(db, "contactMessages"), {
    ...values,
    status: "new",
    createdAt: serverTimestamp(),
  });
}

export async function seedOfficialCatalog() {
  const callable = httpsCallable<Record<string, never>, { count: number }>(functions, "seedOfficialCatalog");
  return (await callable({})).data;
}

export async function createDocumentFromOrder(orderId: string, type: import("@/types").DocumentType, payment?: { method: string; reference: string }) {
  const callable = httpsCallable<
    { orderId: string; type: import("@/types").DocumentType; payment?: { method: string; reference: string } },
    { document: import("@/types").BusinessDocument }
  >(functions, "createDocumentFromOrder");
  return (await callable({ orderId, type, payment })).data.document;
}

export async function createQuotation(payload: {
  customer: { fullName: string; phone: string; email?: string; address?: string };
  items: Array<{ productName: string; description?: string; quantity: number; unit: string; price: number; discount?: number }>;
  notes?: string;
  signature?: string;
  quoteDate?: string;
}) {
  const callable = httpsCallable<typeof payload, { document: import("@/types").BusinessDocument }>(functions, "createQuotation");
  return (await callable(payload)).data.document;
}

export async function saveUserSignature(url: string) {
  const callable = httpsCallable<{ url: string }, { ok: boolean }>(functions, "saveUserSignature");
  return (await callable({ url })).data;
}

export async function removeUserSignature() {
  const callable = httpsCallable<Record<string, never>, { ok: boolean }>(functions, "removeUserSignature");
  return (await callable({})).data;
}

export async function saveDocumentPdf(documentId: string, pdfUrl: string) {
  const callable = httpsCallable<{ documentId: string; pdfUrl: string }, { ok: boolean }>(functions, "saveDocumentPdf");
  return (await callable({ documentId, pdfUrl })).data;
}

export async function getUserSignature(uid: string) {
  const snapshot = await getDoc(doc(db, "signatures", uid));
  return snapshot.exists() ? String(snapshot.data()?.signature || "") : null;
}

export async function archiveDocument(documentId: string) {
  const callable = httpsCallable<{ documentId: string }, { ok: boolean }>(functions, "archiveDocument");
  return (await callable({ documentId })).data;
}

export async function getDocuments() {
  const snapshot = await getDocs(query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(250)));
  return snapshot.docs.map((item) => mapped<import("@/types").BusinessDocument>(item));
}

export async function getSettings() {
  const snapshot = await getDoc(doc(db, "settings", "business"));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveSettings(values: Record<string, unknown>) {
  const callable = httpsCallable<Record<string, unknown>, { ok: boolean }>(functions, "saveSettings");
  return (await callable(values)).data;
}

export async function saveGalleryItem(values: { id?: string; title: string; category: string; src: string }) {
  const callable = httpsCallable<typeof values, { id: string }>(functions, "saveGalleryItem");
  return (await callable(values)).data;
}

export async function archiveGalleryItem(id: string) {
  const callable = httpsCallable<{ id: string }, { ok: boolean }>(functions, "archiveGalleryItem");
  return (await callable({ id })).data;
}
