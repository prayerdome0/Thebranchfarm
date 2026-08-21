import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./config";
import { BUSINESS } from "@/lib/constants";
import { deleteStorageObject } from "./storage";
import type {
  ActivityRecord,
  Animal,
  FarmDocument,
  FarmSettings,
  HealthRecord,
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

/* ------------------------------ Helpers ------------------------------ */

export function animalLabel(animal: Animal | null | undefined, fallback = "") {
  if (!animal) return fallback;
  const typeLabel = animal.animalType.charAt(0).toUpperCase() + animal.animalType.slice(1);
  return [typeLabel, animal.animalId, animal.name].filter(Boolean).join(" · ");
}
