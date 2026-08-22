import {
  addDoc,
  arrayUnion,
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
import { cleanFirestoreData } from "@/lib/firestoreUtils";
import { deleteStorageObject } from "./storage";
import {
  DEMO_PRODUCTS,
  DEMO_VIDEOS,
  demoOrders,
  generateOrderReference,
  getLocalOrder,
  saveLocalOrder,
} from "@/lib/store";
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
  AuditAction,
  AuditEvent,
  FarmModule,
  FarmOperationRecord,
  OperationValues,
  ReviewStatus,
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

function auditPayload(values: {
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityLabel: string;
  description: string;
  module?: FarmModule;
  changes?: AuditEvent["changes"];
}) {
  const current = auth.currentUser;
  return cleanFirestoreData({
    ...values,
    createdBy: current?.uid || "system",
    createdByName: current?.displayName || current?.email || "System",
    createdAt: serverTimestamp(),
  });
}

/**
 * Add an immutable audit event to an existing write batch. Keeping the record
 * and its audit event in one commit means an operational change can never be
 * saved without its Who → What → When entry.
 */
function appendAudit(
  batch: ReturnType<typeof writeBatch>,
  values: Parameters<typeof auditPayload>[0],
) {
  batch.set(doc(collection(db, "auditTrail")), auditPayload(values));
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
  requireUser();
  const duplicate = await getDocs(query(collection(db, "animals"), where("animalId", "==", values.animalId), limit(1)));
  if (!duplicate.empty) throw new Error("duplicate-animal-id");
  const reference = doc(collection(db, "animals"));
  const batch = writeBatch(db);
  batch.set(reference, cleanFirestoreData({ ...values, ...stamp() }));

  // Birth registrations connect both parents to the permanent offspring record.
  for (const parentId of [values.motherId, values.fatherId].filter(Boolean) as string[]) {
    const parentRef = doc(db, "animals", parentId);
    const parent = await getDoc(parentRef).catch(() => null);
    if (parent?.exists()) {
      batch.set(parentRef, { offspringIds: arrayUnion(reference.id), ...updateStamp() }, { merge: true });
    }
  }

  appendAudit(batch, {
    action: "created",
    entityType: "animal",
    entityId: reference.id,
    entityLabel: values.animalId,
    description: `Added ${values.animalType} ${values.animalId} to the permanent animal register.`,
  });
  await batch.commit();
  return reference;
}

export async function updateAnimal(id: string, values: Omit<Animal, "id">) {
  requireUser();
  const batch = writeBatch(db);
  batch.set(doc(db, "animals", id), cleanFirestoreData({ ...values, ...updateStamp() }), { merge: true });
  appendAudit(batch, {
    action: "updated",
    entityType: "animal",
    entityId: id,
    entityLabel: values.animalId,
    description: `Updated the permanent record for ${values.animalId}.`,
  });
  await batch.commit();
}

export async function deleteAnimal(id: string) {
  requireUser();
  const [health, animal] = await Promise.all([getHealthRecords(id), getAnimal(id)]);
  const batch = writeBatch(db);
  health.forEach((record) => batch.delete(doc(db, "animalHealth", record.id)));
  batch.delete(doc(db, "animals", id));
  appendAudit(batch, {
    action: "deleted",
    entityType: "animal",
    entityId: id,
    entityLabel: animal?.animalId || id,
    description: `Deleted animal ${animal?.animalId || id} and its health records.`,
  });
  await batch.commit();
  if (animal?.photoPath && !animal.photoPath.startsWith("cloudinary:")) {
    await deleteStorageObject(animal.photoPath).catch(() => {});
  }
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
  requireUser();
  const reference = doc(collection(db, "animalHealth"));
  const batch = writeBatch(db);
  batch.set(reference, cleanFirestoreData({ ...values, ...stamp() }));
  if (values.healthStatus) {
    batch.set(doc(db, "animals", values.animalId), { healthStatus: values.healthStatus, ...updateStamp() }, { merge: true });
  }
  appendAudit(batch, {
    action: "created",
    entityType: "animal-health",
    entityId: reference.id,
    entityLabel: values.animalLabel || values.animalId,
    description: `Recorded ${values.type} for ${values.animalLabel || values.animalId}: ${values.problem}.`,
  });
  await batch.commit();
  return reference;
}

export async function updateHealthRecord(id: string, values: Omit<HealthRecord, "id">) {
  requireUser();
  const batch = writeBatch(db);
  batch.set(doc(db, "animalHealth", id), cleanFirestoreData({ ...values, ...updateStamp() }), { merge: true });
  if (values.healthStatus) {
    batch.set(doc(db, "animals", values.animalId), { healthStatus: values.healthStatus, ...updateStamp() }, { merge: true });
  }
  appendAudit(batch, {
    action: "updated",
    entityType: "animal-health",
    entityId: id,
    entityLabel: values.animalLabel || values.animalId,
    description: `Updated ${values.type} record for ${values.animalLabel || values.animalId}.`,
  });
  await batch.commit();
}

export async function deleteHealthRecord(id: string) {
  requireUser();
  const existing = await getDoc(doc(db, "animalHealth", id));
  const record = existing.exists() ? (existing.data() as HealthRecord) : null;
  const batch = writeBatch(db);
  batch.delete(doc(db, "animalHealth", id));
  appendAudit(batch, {
    action: "deleted",
    entityType: "animal-health",
    entityId: id,
    entityLabel: record?.animalLabel || record?.animalId || id,
    description: `Deleted a health record for ${record?.animalLabel || record?.animalId || id}.`,
  });
  await batch.commit();
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
  permissions?: string[];
}) {
  const callable = httpsCallable<typeof values, { uid: string; tempPassword: string }>(
    functions,
    "createStaffAccount",
  );
  const result = await callable(values);
  return result.data;
}

/**
 * Save the explicit area permissions for a staff member. Written through the
 * callable so only administrators can change access, and mirrored into the
 * user profile document the workspace reads.
 */
export async function setUserPermissions(uid: string, permissions: string[]) {
  const callable = httpsCallable<{ uid: string; permissions: string[] }, { ok: boolean }>(
    functions,
    "setUserPermissions",
  );
  await callable({ uid, permissions });
}

/**
 * Administrator resets a member's password (for when someone has requested
 * password help). The Cloud Function sets a fresh temporary password on the
 * Auth account, signs the member out everywhere, and returns the new password
 * so the admin can securely share it via WhatsApp or email.
 */
export async function resetMemberPassword(uid: string): Promise<string> {
  const callable = httpsCallable<{ uid: string }, { tempPassword: string }>(
    functions,
    "resetUserPassword",
  );
  const result = await callable({ uid });
  return result.data.tempPassword;
}

/** Update a staff member's contact details (name, phone, job title). */
export async function updateStaffProfile(
  uid: string,
  values: { fullName: string; phone: string; title?: string },
) {
  await setDoc(
    doc(db, "users", uid),
    cleanFirestoreData({ ...values, updatedAt: new Date().toISOString() }),
    { merge: true },
  );
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
  requireUser();
  const reference = doc(collection(db, "farmDocuments"));
  const batch = writeBatch(db);
  batch.set(reference, cleanFirestoreData({ ...values, ...stamp() }));
  appendAudit(batch, {
    action: "created",
    entityType: "farm-document",
    entityId: reference.id,
    entityLabel: values.name,
    description: `Uploaded farm document ${values.name}.`,
  });
  await batch.commit();
  return reference;
}

export async function deleteFarmDocument(id: string) {
  requireUser();
  const snapshot = await getDoc(doc(db, "farmDocuments", id));
  const data = snapshot.exists() ? (snapshot.data() as FarmDocument) : null;
  const batch = writeBatch(db);
  batch.delete(doc(db, "farmDocuments", id));
  appendAudit(batch, {
    action: "deleted",
    entityType: "farm-document",
    entityId: id,
    entityLabel: data?.name || id,
    description: `Deleted farm document ${data?.name || id}.`,
  });
  await batch.commit();
  if (data?.storagePath && !data.storagePath.startsWith("cloudinary:")) await deleteStorageObject(data.storagePath).catch(() => {});
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

/** Customer-safe query. Firestore rules require this exact email constraint. */
export async function getMyQuotations(email: string): Promise<Quotation[]> {
  if (!email.trim()) return [];
  try {
    const snapshot = await getDocs(query(collection(db, "quotations"), where("customerEmail", "==", email.trim().toLowerCase()), limit(100)));
    return snapshot.docs.map((item) => mapped<Quotation>(item)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
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
  return addDoc(collection(db, "quotations"), cleanFirestoreData({ ...values, ...stamp() }));
}
export async function getQuotation(id: string): Promise<Quotation | null> {
  try {
    const snap = await getDoc(doc(db, "quotations", id));
    return snap.exists() ? mapped<Quotation>(snap) : null;
  } catch { return null; }
}
export async function updateQuotation(id: string, patch: Partial<Quotation>) {
  try {
    await updateDoc(doc(db, "quotations", id), cleanFirestoreData({ ...patch, ...updateStamp() }));
    return true;
  } catch { return false; }
}
export async function deleteQuotation(id: string) {
  try { await deleteDoc(doc(db, "quotations", id)); return true; } catch { return false; }
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
  return addDoc(collection(db, "invoices"), cleanFirestoreData({ ...values, ...stamp() }));
}

/* ----------------------------- Receipts ----------------------------- */

export async function getReceipts(): Promise<Receipt[]> {
  try {
    const snap = await getDocs(query(collection(db, "receipts"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => mapped<Receipt>(d));
  } catch { return []; }
}
export async function getMyReceipts(email: string): Promise<Receipt[]> {
  if (!email.trim()) return [];
  try {
    const snapshot = await getDocs(query(collection(db, "receipts"), where("customerEmail", "==", email.trim().toLowerCase()), limit(100)));
    return snapshot.docs.map((item) => mapped<Receipt>(item)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  } catch { return []; }
}
export function watchReceipts(cb: (list: Receipt[]) => void): Unsubscribe {
  try {
    return onSnapshot(query(collection(db, "receipts"), orderBy("createdAt", "desc"), limit(200)), (snap) => cb(snap.docs.map((d) => mapped<Receipt>(d))), () => cb([]));
  } catch { cb([]); return () => {}; }
}
export async function createReceipt(values: Omit<Receipt, "id" | keyof ReturnType<typeof stamp>>) {
  return addDoc(collection(db, "receipts"), cleanFirestoreData({ ...values, ...stamp() }));
}
export async function getReceipt(id: string): Promise<Receipt | null> {
  try {
    const snap = await getDoc(doc(db, "receipts", id));
    return snap.exists() ? mapped<Receipt>(snap) : null;
  } catch { return null; }
}
export async function updateReceipt(id: string, patch: Partial<Receipt>) {
  try {
    await updateDoc(doc(db, "receipts", id), cleanFirestoreData({ ...patch, ...updateStamp() }));
    return true;
  } catch { return false; }
}
export async function deleteReceipt(id: string) {
  try { await deleteDoc(doc(db, "receipts", id)); return true; } catch { return false; }
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
      await updateDoc(doc(db, "customers", existing.id), cleanFirestoreData({
        name: order.customer.name,
        email: order.customer.email || existing.email,
        totalSpent,
        lastOrder: serverTimestamp(),
        deliveryLocation: order.deliveryAddress || order.deliveryLocation || existing.deliveryLocation,
        orders: increment(1),
        updatedAt: serverTimestamp(),
      }));
      return existing.id;
    } else {
      const ref = await addDoc(collection(db, "customers"), cleanFirestoreData({
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
      }));
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
  return addDoc(collection(db, "media"), cleanFirestoreData({ ...values, ...stamp() }));
}

export async function deleteFarmMedia(id: string) {
  return deleteDoc(doc(db, "media", id));
}

export async function updateFarmMedia(id: string, patch: Partial<FarmMedia>) {
  return updateDoc(doc(db, "media", id), cleanFirestoreData({ ...patch, ...updateStamp() }));
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
  requireUser();
  const reference = doc(collection(db, "farmActivities"));
  const batch = writeBatch(db);
  batch.set(reference, cleanFirestoreData({ ...values, ...stamp() }));
  appendAudit(batch, {
    action: "created",
    entityType: "daily-log",
    entityId: reference.id,
    entityLabel: values.activity,
    description: `Recorded ${values.activity.toLowerCase()} in the daily farm log.`,
    module: "daily-log",
  });
  await batch.commit();
  return reference;
}

export async function deleteActivity(id: string) {
  requireUser();
  const batch = writeBatch(db);
  batch.delete(doc(db, "farmActivities", id));
  appendAudit(batch, {
    action: "deleted",
    entityType: "daily-log",
    entityId: id,
    entityLabel: id,
    description: "Deleted a daily farm activity entry.",
    module: "daily-log",
  });
  await batch.commit();
}

/* -------------------------- Farm operations -------------------------- */

export function farmOperationsCollection() {
  // Deliberately filter module in memory. This keeps the initial deployment
  // free of composite-index requirements while the collection is still small.
  return query(collection(db, "farmOperations"), orderBy("createdAt", "desc"), limit(2000));
}

export async function getFarmOperations(module?: FarmModule): Promise<FarmOperationRecord[]> {
  try {
    const snapshot = await getDocs(farmOperationsCollection());
    const records = snapshot.docs.map((item) => mapped<FarmOperationRecord>(item));
    return module ? records.filter((record) => record.module === module && !record.archived) : records.filter((record) => !record.archived);
  } catch {
    return [];
  }
}

export function watchFarmOperations(
  module: FarmModule | null,
  callback: (records: FarmOperationRecord[]) => void,
): Unsubscribe {
  try {
    return onSnapshot(
      farmOperationsCollection(),
      (snapshot) => {
        const records = snapshot.docs.map((item) => mapped<FarmOperationRecord>(item));
        callback(records.filter((record) => !record.archived && (!module || record.module === module)));
      },
      () => callback([]),
    );
  } catch {
    callback([]);
    return () => {};
  }
}

export async function getFarmOperation(id: string): Promise<FarmOperationRecord | null> {
  try {
    const snapshot = await getDoc(doc(db, "farmOperations", id));
    return snapshot.exists() ? mapped<FarmOperationRecord>(snapshot) : null;
  } catch {
    return null;
  }
}

export interface CreateFarmOperationInput {
  module: FarmModule;
  reference: string;
  title: string;
  date: string;
  summary?: string;
  status: string;
  priority?: FarmOperationRecord["priority"];
  animalId?: string;
  animalLabel?: string;
  relatedAnimalIds?: string[];
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  values: OperationValues;
  attachments?: FarmOperationRecord["attachments"];
  reviewStatus: ReviewStatus;
}

/** Create an operational record plus all linked animal effects atomically. */
export async function createFarmOperation(input: CreateFarmOperationInput) {
  requireUser();
  const reference = doc(collection(db, "farmOperations"));
  const batch = writeBatch(db);
  const values: OperationValues = { ...input.values };

  if (input.module === "birth") {
    const animalRef = doc(collection(db, "animals"));
    const tag = String(values.tagNumber || animalRef.id);
    const duplicate = await getDocs(query(collection(db, "animals"), where("animalId", "==", tag), limit(1)));
    if (!duplicate.empty) throw new Error("duplicate-animal-id");
    const firstImage = input.attachments?.find((item) => item.resourceType === "image");
    batch.set(animalRef, cleanFirestoreData({
      animalId: tag,
      tagNumber: tag,
      name: String(values.name || "") || undefined,
      animalType: String(values.animalType || "other"),
      breed: String(values.breed || "Unknown"),
      sex: String(values.sex || "female"),
      dateOfBirth: String(values.birthDate || input.date),
      registrationType: "born",
      acquisitionDate: String(values.birthDate || input.date),
      location: String(values.location || "Farm"),
      weight: typeof values.birthWeight === "number" ? values.birthWeight : null,
      motherId: String(values.motherId || "") || undefined,
      fatherId: String(values.fatherId || "") || undefined,
      status: "active",
      healthStatus: "healthy",
      notes: String(values.healthNotes || "") || undefined,
      photo: firstImage?.url,
      photoPath: firstImage ? `cloudinary:${firstImage.publicId}` : undefined,
      documents: input.attachments,
      ...stamp(),
    }));
    values.createdAnimalId = animalRef.id;
    for (const parentId of [values.motherId, values.fatherId].filter(Boolean) as string[]) {
      batch.set(doc(db, "animals", String(parentId)), { offspringIds: arrayUnion(animalRef.id), ...updateStamp() }, { merge: true });
    }
    appendAudit(batch, {
      action: "created",
      entityType: "animal",
      entityId: animalRef.id,
      entityLabel: tag,
      description: `Created permanent animal profile ${tag} from birth record ${input.reference}.`,
      module: "birth",
    });
  }

  if (input.module === "acquisition") {
    const animalRef = doc(collection(db, "animals"));
    const tag = String(values.tagNumber || animalRef.id);
    const duplicate = await getDocs(query(collection(db, "animals"), where("animalId", "==", tag), limit(1)));
    if (!duplicate.empty) throw new Error("duplicate-animal-id");
    const firstImage = input.attachments?.find((item) => item.resourceType === "image");
    batch.set(animalRef, cleanFirestoreData({
      animalId: tag,
      tagNumber: tag,
      name: String(values.name || "") || undefined,
      animalType: String(values.animalType || "other"),
      breed: String(values.breed || "Unknown"),
      sex: String(values.sex || "female"),
      estimatedAge: String(values.estimatedAge || "") || undefined,
      registrationType: "purchased",
      datePurchased: String(values.purchaseDate || input.date),
      acquisitionDate: String(values.purchaseDate || input.date),
      purchasePrice: typeof values.purchasePrice === "number" ? values.purchasePrice : null,
      supplier: String(values.seller || "") || undefined,
      sellerContact: String(values.sellerContact || "") || undefined,
      purchasedFor: String(values.purchasedFor || "") || undefined,
      transportInformation: String(values.transportInformation || "") || undefined,
      location: String(values.location || "Farm"),
      weight: typeof values.weight === "number" ? values.weight : null,
      status: "active",
      healthStatus: "healthy",
      notes: String(values.notes || "") || undefined,
      photo: firstImage?.url,
      photoPath: firstImage ? `cloudinary:${firstImage.publicId}` : undefined,
      documents: input.attachments,
      ...stamp(),
    }));
    values.createdAnimalId = animalRef.id;
    appendAudit(batch, {
      action: "created",
      entityType: "animal",
      entityId: animalRef.id,
      entityLabel: tag,
      description: `Created permanent animal profile ${tag} from acquisition ${input.reference}.`,
      module: "acquisition",
    });
  }

  if (input.module === "weight" && input.animalId) {
    batch.set(doc(db, "animals", input.animalId), {
      weight: values.currentWeight,
      ...updateStamp(),
    }, { merge: true });
  }

  if (input.module === "movement" && input.animalId) {
    const status = String(values.movementType || "transferred");
    batch.set(doc(db, "animals", input.animalId), cleanFirestoreData({
      status,
      statusDate: input.date,
      statusReason: String(values.reason || ""),
      ...updateStamp(),
    }), { merge: true });
  }

  batch.set(reference, cleanFirestoreData({ ...input, values, ...stamp() }));
  appendAudit(batch, {
    action: "created",
    entityType: "farm-operation",
    entityId: reference.id,
    entityLabel: input.reference,
    description: `Recorded ${input.title} (${input.reference}) in ${input.module}.`,
    module: input.module,
  });
  await batch.commit();
  return reference;
}

export async function updateFarmOperation(
  id: string,
  patch: Partial<Omit<FarmOperationRecord, "id" | "createdAt" | "createdBy" | "createdByName">>,
) {
  requireUser();
  const existing = await getFarmOperation(id);
  if (!existing) throw new Error("not-found");
  const batch = writeBatch(db);
  batch.set(doc(db, "farmOperations", id), cleanFirestoreData({ ...patch, ...updateStamp() }), { merge: true });
  const nextValues = patch.values || existing.values;
  const nextAnimalId = patch.animalId || existing.animalId;
  if (existing.module === "weight" && nextAnimalId) {
    batch.set(doc(db, "animals", nextAnimalId), { weight: nextValues.currentWeight, ...updateStamp() }, { merge: true });
  }
  if (existing.module === "movement" && nextAnimalId) {
    batch.set(doc(db, "animals", nextAnimalId), cleanFirestoreData({
      status: String(nextValues.movementType || "transferred"),
      statusDate: patch.date || existing.date,
      statusReason: String(nextValues.reason || ""),
      ...updateStamp(),
    }), { merge: true });
  }
  appendAudit(batch, {
    action: existing.status !== patch.status && patch.status ? "status-changed" : "updated",
    entityType: "farm-operation",
    entityId: id,
    entityLabel: existing.reference,
    description: existing.status !== patch.status && patch.status
      ? `Changed ${existing.reference} from ${existing.status} to ${patch.status}.`
      : `Updated ${existing.reference}: ${existing.title}.`,
    module: existing.module,
  });
  await batch.commit();
}

export async function reviewFarmOperation(
  id: string,
  decision: "approved" | "rejected",
  note = "",
) {
  const current = requireUser();
  const existing = await getFarmOperation(id);
  if (!existing) throw new Error("not-found");
  const name = current.displayName || current.email || "Administrator";
  const batch = writeBatch(db);
  batch.set(doc(db, "farmOperations", id), cleanFirestoreData({
    reviewStatus: decision,
    reviewedBy: current.uid,
    reviewedByName: name,
    reviewedAt: serverTimestamp(),
    reviewNote: note,
    ...updateStamp(),
  }), { merge: true });
  appendAudit(batch, {
    action: decision,
    entityType: "farm-operation",
    entityId: id,
    entityLabel: existing.reference,
    description: `${decision === "approved" ? "Approved" : "Returned"} ${existing.reference}${note ? `: ${note}` : "."}`,
    module: existing.module,
  });
  await batch.commit();
}

export async function archiveFarmOperation(id: string) {
  requireUser();
  const existing = await getFarmOperation(id);
  if (!existing) throw new Error("not-found");
  const batch = writeBatch(db);
  batch.set(doc(db, "farmOperations", id), { archived: true, ...updateStamp() }, { merge: true });
  appendAudit(batch, {
    action: "archived",
    entityType: "farm-operation",
    entityId: id,
    entityLabel: existing.reference,
    description: `Archived ${existing.reference}: ${existing.title}.`,
    module: existing.module,
  });
  await batch.commit();
}

export async function getAuditTrail(maximum = 500): Promise<AuditEvent[]> {
  try {
    const snapshot = await getDocs(query(collection(db, "auditTrail"), orderBy("createdAt", "desc"), limit(maximum)));
    return snapshot.docs.map((item) => mapped<AuditEvent>(item));
  } catch {
    return [];
  }
}

export function watchAuditTrail(callback: (events: AuditEvent[]) => void, maximum = 500): Unsubscribe {
  try {
    return onSnapshot(
      query(collection(db, "auditTrail"), orderBy("createdAt", "desc"), limit(maximum)),
      (snapshot) => callback(snapshot.docs.map((item) => mapped<AuditEvent>(item))),
      () => callback([]),
    );
  } catch {
    callback([]);
    return () => {};
  }
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
  return setDoc(doc(db, "settings", "farm"), cleanFirestoreData({ ...values, ...updateStamp() }));
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
  return addDoc(collection(db, "products"), cleanFirestoreData({ ...values, ...stamp() }));
}

export async function updateProduct(id: string, values: Omit<Product, "id">) {
  return setDoc(doc(db, "products", id), cleanFirestoreData({ ...values, ...updateStamp() }));
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
    batch.set(doc(ref), cleanFirestoreData({ ...product, ...stamp() }));
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
      transaction.set(orderRef, cleanFirestoreData(order));
      return orderRef;
    });

    const created: Order = { ...order, id: ref.id, createdAt: new Date(), updatedAt: new Date() } as Order;
    // Keep a local copy so the success page and /track can show this order
    // instantly — guests cannot read orders straight from Firestore.
    saveLocalOrder(created);
    // Create customer record async (don't block)
    createOrUpdateCustomerFromOrder(created).catch(() => {});
    return created;
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
    saveLocalOrder(fallback);
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

export async function getMyOrders(email: string): Promise<Order[]> {
  if (!email.trim()) return [];
  try {
    const snapshot = await getDocs(query(collection(db, "orders"), where("customer.email", "==", email.trim().toLowerCase()), limit(100)));
    return snapshot.docs.map((item) => mapped<Order>(item)).sort((a, b) => {
      const aDate = typeof a.createdAt === "string" ? a.createdAt : "";
      const bDate = typeof b.createdAt === "string" ? b.createdAt : "";
      return bDate.localeCompare(aDate);
    });
  } catch {
    return [];
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
  const normalized = reference.trim().toUpperCase();
  // Orders placed from this browser are always visible locally — guests cannot
  // read the orders collection straight from Firestore.
  const local = getLocalOrder(normalized) || (demoOrders.get(normalized) as Order | null);
  try {
    const snapshot = await getDocs(
      query(collection(db, "orders"), where("reference", "==", normalized), limit(1)),
    );
    const first = snapshot.docs[0];
    return first ? mapped<Order>(first) : local;
  } catch {
    return local;
  }
}

export async function updateOrder(
  id: string,
  patch: Partial<
    Pick<
      Order,
      | "status"
      | "paymentStatus"
      | "paymentMethod"
      | "notes"
      | "signature"
      | "signedByName"
      | "signedAt"
      | "deliveryAddress"
    >
  >,
) {
  try {
    await updateDoc(doc(db, "orders", id), cleanFirestoreData({ ...patch, ...updateStamp() }));
    return true;
  } catch {
    demoOrders.update(id, { ...patch, updatedAt: new Date() });
    return true;
  }
}

/* --------------------------- Public order tracking --------------------------- */

export interface TrackOrderPayload {
  reference: string;
  status: Order["status"];
  fulfillment: Order["fulfillment"];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type LookupOrderResult =
  | { status: "found"; order: Order }
  | { status: "not-found" }
  | { status: "unavailable"; message?: string };

function isTrackPayload(value: unknown): value is TrackOrderPayload {
  return Boolean(value && typeof value === "object" && "reference" in value && "status" in value);
}

/**
 * Public order lookup by TB-XXXXXX reference.
 *
 * Privacy is strict: anyone may hold or guess a reference, so the live lookup
 * returns ONLY the order's public progress (reference, status, fulfillment,
 * dates) — never the customer's name, phone, email, delivery address, items,
 * prices, totals or payment details. When the backend is unreachable it falls
 * back to the local copy of orders placed on THIS device (i.e. the customer's
 * own orders) so a customer still sees their own order.
 */
export async function lookupOrderByReference(reference: string): Promise<LookupOrderResult> {
  const normalized = reference.trim().toUpperCase();

  try {
    const callable = httpsCallable<{ reference: string }, TrackOrderPayload>(functions, "trackOrder");
    const response = await callable({ reference: normalized });
    if (isTrackPayload(response.data)) {
      // Public-safe order object: no customer details, items or payment.
      const order: Order = {
        id: response.data.reference,
        reference: response.data.reference,
        status: response.data.status,
        paymentStatus: "unpaid",
        total: 0,
        subtotal: 0,
        deliveryFee: 0,
        fulfillment: response.data.fulfillment,
        items: [],
        customer: { name: "", phone: "", email: undefined },
        deliveryAddress: undefined,
        deliveryLocation: undefined,
        notes: undefined,
        paymentMethod: undefined,
        createdAt: response.data.createdAt ?? null,
        updatedAt: response.data.updatedAt ?? null,
      };
      return { status: "found", order };
    }
  } catch (cause) {
    const code = String((cause as { code?: string })?.code || "");
    const message = cause instanceof Error ? cause.message : String(cause || "");
    // A deployed `trackOrder` function answers `not-found` when the reference
    // does not exist. A MISSING deployment answers 404 "Function not found",
    // which is not the same thing — treat that as "could not check".
    const backendMissing = /function\s+not\s+found|no\s+function|cloud\s+functions\b/i.test(message);
    if (/not-found/.test(code) && !backendMissing) {
      return { status: "not-found" };
    }
    // Otherwise the backend is unavailable/not deployed — fall through to the
    // local copy and legacy paths so a customer still sees their own order.
  }

  try {
    const order = await getOrderByReference(normalized);
    if (order) return { status: "found", order };
  } catch {
    /* fall through */
  }

  // We could not positively confirm the order exists and found no local copy —
  // say "couldn't check" instead of a false "order not found".
  return { status: "unavailable", message: "Order tracking is temporarily unavailable. Please try again or contact the farm." };
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
  return addDoc(collection(db, "videos"), cleanFirestoreData({ ...values, ...stamp() }));
}

export async function seedDemoVideos(): Promise<number> {
  const batch = writeBatch(db);
  const ref = collection(db, "videos");
  DEMO_VIDEOS.forEach((video) => {
    batch.set(doc(ref), cleanFirestoreData({ ...video, ...stamp() }));
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
  const rawType = String((animal as { animalType?: unknown; species?: unknown }).animalType
    || (animal as { species?: unknown }).species
    || "Animal");
  const typeLabel = rawType.charAt(0).toUpperCase() + rawType.slice(1);
  return [typeLabel, animal.animalId, animal.name].filter(Boolean).join(" · ");
}
