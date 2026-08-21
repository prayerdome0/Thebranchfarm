import { randomBytes } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { z } from "zod";

if (!getApps().length) initializeApp();
const db = getFirestore();
const initialAdminEmails = defineString("INITIAL_ADMIN_EMAILS", { default: "" });
const REGION = "us-central1";
const VALID_ROLES = ["user", "staff", "admin"] as const;
const ORDER_STATUSES = ["pending", "confirmed", "preparing", "ready", "out-for-delivery", "delivered", "completed", "cancelled"] as const;

type Role = (typeof VALID_ROLES)[number];
type OrderStatus = (typeof ORDER_STATUSES)[number];

const initialProducts = [
  { id: "raw-fresh-full-fat-milk", slug: "raw-fresh-full-fat-milk", name: "Raw Fresh Full-Fat Milk", category: "dairy", description: "Naturally rich, raw full-fat milk — fresh from the farm.", longDescription: "Fresh raw full-fat milk supplied from Ngculwini.", price: 16, unit: "litre", priceLabel: "E16/L", availability: "available", stock: null, trackStock: false, images: ["/media/raw-milk.jpg"], location: "Ngculwini", featured: true },
  { id: "sour-milk-latsambile", slug: "sour-milk-latsambile", name: "Sour Milk — Latsambile", category: "dairy", description: "Traditional sour milk in the Latsambile size.", price: 20, unit: "Latsambile", priceLabel: "E20", availability: "available", stock: null, trackStock: false, images: ["/media/latsambile.jpg"], location: "Ngculwini", featured: true },
  { id: "sour-milk-lashubile", slug: "sour-milk-lashubile", name: "Sour Milk — Lashubile", category: "dairy", description: "Traditional sour milk in the larger Lashubile size.", price: 35, unit: "Lashubile", priceLabel: "E35", availability: "available", stock: null, trackStock: false, images: ["/media/lashubile.jpg"], location: "Ngculwini", featured: true },
  { id: "farm-eggs", slug: "farm-eggs", name: "Farm Eggs", category: "eggs", description: "Fresh farm eggs are part of our growing product range.", price: 0, unit: "tray", availability: "coming-soon", images: ["/media/eggs.jpg"], featured: true },
  { id: "farm-beef", slug: "farm-beef", name: "Farm Beef", category: "beef", description: "Quality farm beef is planned for a future release.", price: 0, unit: "kg", availability: "coming-soon", images: ["/media/cattle.jpg"], featured: false },
  { id: "farm-pork", slug: "farm-pork", name: "Farm Pork", category: "pork", description: "Farm pork is planned for a future release.", price: 0, unit: "kg", availability: "coming-soon", images: ["/media/farm-operations.jpg"], featured: false },
  { id: "farm-chicken", slug: "farm-chicken", name: "Farm Chicken", category: "chicken", description: "Farm chicken is planned for a future release.", price: 0, unit: "bird", availability: "coming-soon", images: ["/media/poultry.jpg"], featured: false },
] as const;

async function actor(uid: string | undefined, roles: Role[]) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
  const snapshot = await db.doc(`users/${uid}`).get();
  const data = snapshot.data();
  if (!data || data.status !== "active" || !roles.includes(data.role as Role)) {
    throw new HttpsError("permission-denied", "This account is not authorized.");
  }
  return { uid, name: String(data.fullName || data.email || "Authorized user"), role: data.role as Role };
}

async function audit(action: string, user: { uid: string; name: string; role: Role } | null, values: Record<string, unknown>) {
  await db.collection("auditLogs").add({
    action,
    actorId: user?.uid || "system",
    actorName: user?.name || "Secure system",
    actorRole: user?.role || "system",
    ...values,
    timestamp: FieldValue.serverTimestamp(),
  });
}

async function nextNumber(prefix: string) {
  const year = new Date().getUTCFullYear();
  const ref = db.doc(`counters/${prefix.toLowerCase()}-${year}`);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const next = Number(snapshot.data()?.value || 0) + 1;
    transaction.set(ref, { value: next, prefix, year, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return `${prefix}-${year}-${String(next).padStart(6, "0")}`;
  });
}

function verificationCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return `VER-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

export const bootstrapInitialAdmin = onDocumentCreated(
  { document: "users/{uid}", region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const profile = snapshot.data();
    const allowlist = initialAdminEmails.value().split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (!allowlist.includes(String(profile.email || "").toLowerCase())) return;
    const uid = event.params.uid;
    await Promise.all([
      snapshot.ref.update({ role: "admin", updatedAt: FieldValue.serverTimestamp() }),
      getAuth().setCustomUserClaims(uid, { role: "admin" }),
    ]);
    await audit("initial_admin_bootstrapped", null, { targetType: "user", targetId: uid, after: "admin" });
  },
);

function farmCreationAudit(collectionName: string) {
  return onDocumentCreated({ document: `${collectionName}/{recordId}`, region: REGION }, async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const uid = String(data.createdBy || "system");
    const profile = uid === "system" ? null : await db.doc(`users/${uid}`).get();
    await audit("farm_record_created", profile?.exists ? { uid, name: String(profile.data()?.fullName || "Staff member"), role: (profile.data()?.role || "staff") as Role } : null, { targetType: collectionName, targetId: event.params.recordId });
    if (collectionName === "inventory" && Number(data.quantity) <= Number(data.lowStockThreshold)) {
      await db.collection("notifications").add({ type: "low-inventory", title: "Low inventory", body: `${String(data.product)} has reached ${String(data.quantity)} ${String(data.unit)}.`, link: "/admin/farm/inventory", audience: "admin", read: false, createdAt: FieldValue.serverTimestamp() });
    }
  });
}

function farmUpdateAudit(collectionName: string) {
  return onDocumentUpdated({ document: `${collectionName}/{recordId}`, region: REGION }, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    const uid = String(after.updatedBy || "system");
    const profile = uid === "system" ? null : await db.doc(`users/${uid}`).get();
    await audit(after.archived && !before.archived ? "farm_record_archived" : "farm_record_updated", profile?.exists ? { uid, name: String(profile.data()?.fullName || "Staff member"), role: (profile.data()?.role || "staff") as Role } : null, { targetType: collectionName, targetId: event.params.recordId });
  });
}

export const auditAnimalCreated = farmCreationAudit("animals");
export const auditMilkCreated = farmCreationAudit("milkProduction");
export const auditEggsCreated = farmCreationAudit("eggProduction");
export const auditInventoryCreated = farmCreationAudit("inventory");
export const auditActivityCreated = farmCreationAudit("farmActivities");
export const auditCropCreated = farmCreationAudit("crops");
export const auditFeedCreated = farmCreationAudit("feed");
export const auditHealthCreated = farmCreationAudit("animalHealth");
export const auditEquipmentCreated = farmCreationAudit("equipment");
export const auditAnimalUpdated = farmUpdateAudit("animals");
export const auditMilkUpdated = farmUpdateAudit("milkProduction");
export const auditEggsUpdated = farmUpdateAudit("eggProduction");
export const auditInventoryUpdated = farmUpdateAudit("inventory");
export const auditActivityUpdated = farmUpdateAudit("farmActivities");
export const auditCropUpdated = farmUpdateAudit("crops");
export const auditFeedUpdated = farmUpdateAudit("feed");
export const auditHealthUpdated = farmUpdateAudit("animalHealth");
export const auditEquipmentUpdated = farmUpdateAudit("equipment");

export const setUserRole = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ uid: z.string().min(10).max(128), role: z.enum(VALID_ROLES) }).parse(request.data);
  if (input.uid === current.uid) throw new HttpsError("failed-precondition", "Administrators cannot change their own role.");
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const before = target.data()?.role || "user";
  await Promise.all([
    ref.update({ role: input.role, updatedAt: FieldValue.serverTimestamp() }),
    getAuth().setCustomUserClaims(input.uid, { ...(await getAuth().getUser(input.uid)).customClaims, role: input.role }),
  ]);
  await audit("user_role_changed", current, { targetType: "user", targetId: input.uid, before, after: input.role });
  return { ok: true };
});

export const setUserStatus = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ uid: z.string().min(10).max(128), status: z.enum(["active", "disabled"]) }).parse(request.data);
  if (input.uid === current.uid) throw new HttpsError("failed-precondition", "Administrators cannot disable themselves.");
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const before = target.data()?.status || "active";
  await Promise.all([
    ref.update({ status: input.status, updatedAt: FieldValue.serverTimestamp() }),
    getAuth().updateUser(input.uid, { disabled: input.status === "disabled" }),
  ]);
  await audit("user_status_changed", current, { targetType: "user", targetId: input.uid, before, after: input.status });
  return { ok: true };
});

const productSchema = z.object({
  id: z.string().min(2).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  category: z.enum(["dairy", "eggs", "beef", "pork", "chicken", "other"]),
  description: z.string().trim().min(3).max(500),
  longDescription: z.string().max(3000).optional().default(""),
  price: z.number().min(0).max(1_000_000),
  unit: z.string().trim().min(1).max(40),
  priceLabel: z.string().max(40).optional(),
  availability: z.enum(["available", "coming-soon", "unavailable"]),
  stock: z.number().min(0).nullable().optional(),
  trackStock: z.boolean().optional().default(false),
  images: z.array(z.string().max(1000)).max(8),
  location: z.string().max(120).optional(),
  featured: z.boolean().optional().default(false),
}).strict();

export const saveProduct = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = productSchema.parse(request.data);
  if (input.availability === "available" && input.price <= 0) throw new HttpsError("invalid-argument", "Available products require an official price.");
  const ref = db.doc(`products/${input.id}`);
  const previous = await ref.get();
  await ref.set({ ...input, createdAt: previous.data()?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: current.uid }, { merge: true });
  await audit(previous.exists ? "product_updated" : "product_created", current, { targetType: "product", targetId: input.id, before: previous.exists ? { price: previous.data()?.price, availability: previous.data()?.availability } : null, after: { price: input.price, availability: input.availability } });
  return { ok: true };
});

export const seedOfficialCatalog = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const batch = db.batch();
  for (const product of initialProducts) {
    const ref = db.doc(`products/${product.id}`);
    const exists = await ref.get();
    if (!exists.exists) batch.create(ref, { ...product, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: current.uid });
  }
  await batch.commit();
  await audit("official_catalog_initialized", current, { targetType: "products", count: initialProducts.length });
  return { count: initialProducts.length };
});

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(2).max(100), quantity: z.number().int().min(1).max(999) }).strict()).min(1).max(30),
  customer: z.object({ fullName: z.string().trim().min(2).max(100), phone: z.string().trim().min(8).max(24), whatsappAvailable: z.boolean(), email: z.string().email().max(200).optional() }).strict(),
  delivery: z.object({ address: z.string().trim().min(4).max(300), location: z.string().trim().min(2).max(100), instructions: z.string().max(500).optional() }).strict(),
}).strict();

export const createOrder = onCall({ region: REGION, timeoutSeconds: 60 }, async (request) => {
  let input: z.infer<typeof checkoutSchema>;
  try { input = checkoutSchema.parse(request.data); } catch { throw new HttpsError("invalid-argument", "Check the order details."); }
  const combined = new Map<string, number>();
  for (const item of input.items) combined.set(item.productId, (combined.get(item.productId) || 0) + item.quantity);
  const itemPairs = [...combined.entries()];
  const refs = itemPairs.map(([id]) => db.doc(`products/${id}`));
  const snapshots = await db.getAll(...refs);
  const items = itemPairs.map(([productId, quantity], index) => {
    const stored = (snapshots[index].exists ? snapshots[index].data() : initialProducts.find((product) => product.id === productId)) as Record<string, any> | undefined;
    if (!stored) throw new HttpsError("not-found", "A selected product no longer exists.");
    if (stored.availability !== "available") throw new HttpsError("failed-precondition", `${stored.name} is not available for checkout.`);
    const price = Number(stored.price);
    if (!Number.isFinite(price) || price <= 0) throw new HttpsError("failed-precondition", "A product price is not configured.");
    if (stored.trackStock && Number(stored.stock || 0) < quantity) throw new HttpsError("failed-precondition", `Not enough ${stored.name} is currently available.`);
    return { productId, productName: String(stored.name), image: Array.isArray(stored.images) ? stored.images[0] || "" : "", price, quantity, unit: String(stored.unit), subtotal: price * quantity };
  });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const location = input.delivery.location.toLowerCase();
  const free = ["manzini", "matsapha"].some((area) => location === area || location.includes(area));
  const deliveryFee = free ? 0 : null;
  const deliveryLabel = free ? "FREE delivery" : "To be arranged";
  const total = subtotal;
  const orderNumber = await nextNumber("ORD");
  const orderRef = db.collection("orders").doc();
  const order = {
    orderNumber,
    customer: { ...input.customer, userId: request.auth?.uid || null },
    delivery: { ...input.delivery, fee: deliveryFee, label: deliveryLabel },
    items,
    subtotal,
    deliveryFee,
    total,
    status: "pending" as const,
    agreementAccepted: false,
    documentVersion: 1,
    statusHistory: [{ status: "pending", at: Timestamp.now(), by: request.auth?.uid || "customer" }],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    archived: false,
  };
  await db.runTransaction(async (transaction) => {
    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      const data = snapshot.data();
      if (snapshot.exists && data?.trackStock) {
        const quantity = itemPairs[index][1];
        if (Number(data.stock || 0) < quantity) throw new HttpsError("failed-precondition", "Stock changed while checking out. Please review your cart.");
        transaction.update(snapshot.ref, { stock: FieldValue.increment(-quantity), updatedAt: FieldValue.serverTimestamp() });
      }
    }
    transaction.create(orderRef, order);
  });
  const notificationBase = { type: "new-order", title: "New order received", body: `${input.customer.fullName} · ${orderNumber} · ${items.map((item) => `${item.productName} ${item.quantity}`).join(", ")} · E${total}`, link: "/staff/orders", read: false, createdAt: FieldValue.serverTimestamp() };
  const notificationBatch = db.batch();
  notificationBatch.create(db.collection("notifications").doc(), { ...notificationBase, audience: "staff" });
  notificationBatch.create(db.collection("notifications").doc(), { ...notificationBase, audience: "admin", link: "/admin/orders" });
  if (request.auth?.uid) notificationBatch.create(db.collection("notifications").doc(), { type: "order-created", title: "Order received", body: `${orderNumber} has been safely recorded.`, link: "/dashboard/orders", read: false, userId: request.auth.uid, audience: "customer", createdAt: FieldValue.serverTimestamp() });
  await notificationBatch.commit();
  await audit("order_created", null, { targetType: "order", targetId: orderRef.id, orderNumber, total, authenticatedUser: request.auth?.uid || null });
  return { orderNumber, id: orderRef.id, total, deliveryLabel };
});

export const trackOrder = onCall({ region: REGION }, async (request) => {
  const input = z.object({ orderNumber: z.string().regex(/^ORD-\d{4}-\d{6}$/), phoneLast4: z.string().regex(/^\d{4}$/).optional() }).parse(request.data);
  const snapshot = await db.collection("orders").where("orderNumber", "==", input.orderNumber).limit(1).get();
  if (snapshot.empty) return { order: null };
  const doc = snapshot.docs[0];
  const data = doc.data();
  const owner = Boolean(request.auth?.uid && data.customer?.userId === request.auth.uid);
  const actualLast4 = String(data.customer?.phone || "").replace(/\D/g, "").slice(-4);
  if (!owner && (!input.phoneLast4 || input.phoneLast4 !== actualLast4)) return { order: null };
  return { order: { id: doc.id, orderNumber: data.orderNumber, delivery: { location: data.delivery.location, label: data.delivery.label, address: "", fee: data.delivery.fee }, items: data.items, subtotal: data.subtotal, deliveryFee: data.deliveryFee, total: data.total, status: data.status, agreementAccepted: data.agreementAccepted, documentVersion: data.documentVersion, createdAt: data.createdAt, updatedAt: data.updatedAt } };
});

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready", "cancelled"], ready: ["out-for-delivery", "delivered", "cancelled"], "out-for-delivery": ["delivered", "cancelled"], delivered: ["completed"], completed: [], cancelled: [],
};
export const updateOrderStatus = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  const input = z.object({ orderId: z.string().min(5).max(128), status: z.enum(ORDER_STATUSES) }).parse(request.data);
  const ref = db.doc(`orders/${input.orderId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Order not found.");
  const before = snapshot.data()?.status as OrderStatus;
  if (before !== input.status && !allowedTransitions[before]?.includes(input.status)) throw new HttpsError("failed-precondition", `An order cannot move directly from ${before} to ${input.status}.`);
  await ref.update({ status: input.status, updatedAt: FieldValue.serverTimestamp(), statusHistory: FieldValue.arrayUnion({ status: input.status, at: Timestamp.now(), by: current.uid }) });
  const customerId = snapshot.data()?.customer?.userId;
  if (customerId) await db.collection("notifications").add({ type: "order-status", title: `Order ${input.status.replaceAll("-", " ")}`, body: `${snapshot.data()?.orderNumber} is now ${input.status.replaceAll("-", " ")}.`, link: "/dashboard/orders", read: false, userId: customerId, audience: "customer", createdAt: FieldValue.serverTimestamp() });
  await audit("order_status_changed", current, { targetType: "order", targetId: input.orderId, before, after: input.status });
  return { ok: true };
});

export const createDocumentFromOrder = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  const input = z.object({ orderId: z.string().min(5).max(128), type: z.enum(["quotation", "invoice", "receipt", "agreement"]), payment: z.object({ method: z.string().trim().min(2).max(80), reference: z.string().trim().min(2).max(120) }).optional() }).parse(request.data);
  if (input.type === "receipt" && !input.payment) throw new HttpsError("invalid-argument", "A receipt requires a payment method and reference.");
  const orderSnapshot = await db.doc(`orders/${input.orderId}`).get();
  if (!orderSnapshot.exists) throw new HttpsError("not-found", "Order not found.");
  const order = orderSnapshot.data()!;
  const prefixes = { quotation: "QUO", invoice: "INV", receipt: "REC", agreement: "AGR" } as const;
  const documentNumber = await nextNumber(prefixes[input.type]);
  let code = verificationCode();
  while ((await db.doc(`documentVerifications/${code}`).get()).exists) code = verificationCode();
  const documentRef = db.collection("documents").doc();
  const status = input.type === "quotation" ? "draft" : input.type === "receipt" ? "paid" : "sent";
  let preparedSignature = "";
  const stored = await db.doc(`signatures/${current.uid}`).get();
  if (stored.exists) preparedSignature = String(stored.data()?.signature || "");
  const document = {
    id: documentRef.id,
    customerId: order.customer?.userId || null,
    documentNumber,
    type: input.type,
    customer: { fullName: order.customer.fullName, phone: order.customer.phone, email: order.customer.email || null, address: order.delivery?.address || null },
    items: order.items,
    subtotal: order.subtotal,
    discount: 0,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status,
    orderId: input.orderId,
    orderNumber: order.orderNumber,
    paymentMethod: input.payment?.method || null,
    paymentReference: input.payment?.reference || null,
    verificationCode: code,
    version: 1,
    signature: preparedSignature || null,
    preparedBy: current.name,
    issuedBy: current.uid,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    archived: false,
  };
  const relatedInvoices = input.type === "receipt"
    ? await db.collection("documents").where("orderId", "==", input.orderId).get()
    : null;
  const batch = db.batch();
  batch.create(documentRef, document);
  if (input.type === "receipt" && input.payment) {
    batch.update(orderSnapshot.ref, { paymentStatus: "paid", paymentMethod: input.payment.method, paymentReference: input.payment.reference, updatedAt: Timestamp.now() });
    relatedInvoices?.docs.filter((invoice) => invoice.data().type === "invoice").forEach((invoice) => batch.update(invoice.ref, { status: "paid", updatedAt: Timestamp.now() }));
  }
  batch.create(db.doc(`documentVerifications/${code}`), { code, documentId: documentRef.id, documentType: input.type, documentNumber, orderNumber: order.orderNumber, customerName: order.customer.fullName, total: order.total, status, issuedBy: current.name, issuedAt: Timestamp.now(), active: true });
  if (order.customer?.userId) batch.create(db.collection("notifications").doc(), { type: "document-created", title: `${input.type} available`, body: `${documentNumber} is now available in your documents.`, link: "/dashboard/documents", read: false, userId: order.customer.userId, audience: "customer", createdAt: Timestamp.now() });
  await batch.commit();
  await audit("document_created", current, { targetType: input.type, targetId: documentRef.id, documentNumber, orderNumber: order.orderNumber, verificationCode: code });
  return { document };
});

export const archiveDocument = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ documentId: z.string().min(5).max(128) }).parse(request.data);
  const ref = db.doc(`documents/${input.documentId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Document not found.");
  if (snapshot.data()?.status === "archived") return { ok: true };
  const batch = db.batch();
  batch.update(ref, { status: "archived", archived: true, archivedAt: Timestamp.now(), archivedBy: current.uid, updatedAt: Timestamp.now() });
  const code = snapshot.data()?.verificationCode;
  if (code) batch.update(db.doc(`documentVerifications/${code}`), { status: "archived", archivedAt: Timestamp.now() });
  await batch.commit();
  await audit("document_archived", current, { targetType: snapshot.data()?.type || "document", targetId: input.documentId, documentNumber: snapshot.data()?.documentNumber });
  return { ok: true };
});

export const saveUserSignature = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  const input = z.object({ url: z.string().url().max(1200).optional(), signature: z.string().startsWith("data:image/png;base64,").max(700_000).optional() }).strict().refine((value) => Boolean(value.url || value.signature), { message: "Provide a signature image." }).parse(request.data);
  const value = input.url || input.signature || "";
  const batch = db.batch();
  batch.set(db.doc(`users/${current.uid}`), { signature: value, updatedAt: Timestamp.now() }, { merge: true });
  batch.set(db.doc(`signatures/${current.uid}`), { userId: current.uid, name: current.name, signature: value, updatedAt: Timestamp.now(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
  await batch.commit();
  await audit("signature_updated", current, { targetType: "user", targetId: current.uid });
  return { ok: true };
});

export const removeUserSignature = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  const batch = db.batch();
  batch.update(db.doc(`users/${current.uid}`), { signature: FieldValue.delete(), updatedAt: Timestamp.now() });
  batch.set(db.doc(`signatures/${current.uid}`), { userId: current.uid, name: current.name, signature: "", updatedAt: Timestamp.now() }, { merge: true });
  await batch.commit();
  await audit("signature_removed", current, { targetType: "user", targetId: current.uid });
  return { ok: true };
});

const quotationSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(8).max(24),
    email: z.string().email().max(200).optional(),
    address: z.string().trim().max(300).optional(),
  }).strict(),
  items: z.array(z.object({
    productName: z.string().trim().min(1).max(150),
    description: z.string().max(500).optional(),
    quantity: z.number().int().min(1).max(9999),
    unit: z.string().trim().min(1).max(40),
    price: z.number().min(0).max(10_000_000),
    discount: z.number().min(0).max(10_000_000).optional().default(0),
  }).strict()).min(1).max(40),
  notes: z.string().max(3000).optional(),
  signature: z.string().max(1200).optional(),
  quoteDate: z.string().max(20).optional(),
}).strict();

export const createQuotation = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  let input: z.infer<typeof quotationSchema>;
  try { input = quotationSchema.parse(request.data); } catch { throw new HttpsError("invalid-argument", "Check the quotation details."); }
  const items = input.items.map((item) => {
    const discount = Number(item.discount || 0);
    const subtotal = Math.max(0, (item.price - discount) * item.quantity);
    return {
      productName: item.productName,
      description: item.description || "",
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      discount,
      subtotal,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = items.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const documentNumber = await nextNumber("QUO");
  let code = verificationCode();
  while ((await db.doc(`documentVerifications/${code}`).get()).exists) code = verificationCode();
  const ref = db.collection("documents").doc();
  let signature = input.signature || "";
  if (!signature) {
    const stored = await db.doc(`signatures/${current.uid}`).get();
    signature = stored.exists ? String(stored.data()?.signature || "") : "";
  }
  const document = {
    id: ref.id,
    documentNumber,
    type: "quotation" as const,
    customer: { fullName: input.customer.fullName, phone: input.customer.phone, email: input.customer.email || null, address: input.customer.address || null },
    items,
    subtotal,
    discount,
    deliveryFee: null,
    total,
    status: "sent" as const,
    verificationCode: code,
    version: 1,
    signature: signature || null,
    preparedBy: current.name,
    issuedBy: current.uid,
    quoteDate: input.quoteDate || null,
    notes: input.notes || null,
    pdfUrl: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    archived: false,
  };
  const batch = db.batch();
  batch.create(ref, document);
  batch.create(db.doc(`documentVerifications/${code}`), { code, documentId: ref.id, documentType: "quotation", documentNumber, customerName: input.customer.fullName, total, status: "sent", issuedBy: current.name, issuedAt: Timestamp.now(), active: true });
  await batch.commit();
  await audit("quotation_created", current, { targetType: "quotation", targetId: ref.id, documentNumber, total, verificationCode: code });
  return { document };
});

export const saveDocumentPdf = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["staff", "admin"]);
  const input = z.object({ documentId: z.string().min(5).max(128), pdfUrl: z.string().url().max(1200) }).strict().parse(request.data);
  const ref = db.doc(`documents/${input.documentId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Document not found.");
  await ref.update({ pdfUrl: input.pdfUrl, updatedAt: Timestamp.now(), updatedBy: current.uid });
  await audit("document_pdf_saved", current, { targetType: snapshot.data()?.type || "document", targetId: input.documentId, documentNumber: snapshot.data()?.documentNumber });
  return { ok: true };
});

export const saveGalleryItem = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ id: z.string().max(128).optional(), title: z.string().trim().min(2).max(120), category: z.string().trim().min(2).max(60), src: z.string().min(4).max(1000) }).strict().parse(request.data);
  const ref = input.id ? db.doc(`gallery/${input.id}`) : db.collection("gallery").doc();
  const previous = await ref.get();
  await ref.set({ title: input.title, category: input.category, src: input.src, archived: false, createdAt: previous.data()?.createdAt || FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: current.uid }, { merge: true });
  await audit(previous.exists ? "gallery_item_updated" : "gallery_item_created", current, { targetType: "gallery", targetId: ref.id });
  return { id: ref.id };
});

export const archiveGalleryItem = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ id: z.string().min(5).max(128) }).parse(request.data);
  const ref = db.doc(`gallery/${input.id}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Gallery item not found.");
  await ref.update({ archived: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: current.uid });
  await audit("gallery_item_archived", current, { targetType: "gallery", targetId: input.id });
  return { ok: true };
});

export const saveSettings = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({
    farmName: z.string().min(2).max(100), slogan: z.string().max(100), phone: z.string().max(30), whatsapp: z.string().max(30), location: z.string().max(200), email: z.string().max(200), currency: z.string().min(1).max(5), freeDeliveryAreas: z.string().max(500), otherDelivery: z.string().max(500), terms: z.string().max(3000), heroHeadline: z.string().max(300), announcement: z.string().max(300), orderPrefix: z.string().regex(/^[A-Z]{2,5}$/), quotationPrefix: z.string().regex(/^[A-Z]{2,5}$/), invoicePrefix: z.string().regex(/^[A-Z]{2,5}$/), receiptPrefix: z.string().regex(/^[A-Z]{2,5}$/),
  }).strict().parse(request.data);
  const ref = db.doc("settings/business");
  const previous = await ref.get();
  await ref.set({ ...input, updatedBy: current.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit("business_settings_updated", current, { targetType: "settings", targetId: "business", before: previous.exists ? "existing version" : null, after: "new version" });
  return { ok: true };
});
