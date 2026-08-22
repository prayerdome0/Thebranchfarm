import { randomBytes } from "node:crypto";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { z } from "zod";

if (!getApps().length) initializeApp();
const db = getFirestore();
const initialAdminEmails = defineString("INITIAL_ADMIN_EMAILS", { default: "" });
const notificationWebhook = defineString("NOTIFICATION_WEBHOOK_URL", { default: "" });
const REGION = "us-central1";
const VALID_ROLES = ["user", "staff", "admin"] as const;

type Role = (typeof VALID_ROLES)[number];

/**
 * Re-verifies the caller against the Firestore profile inside every privileged
 * callable — the browser can be trusted to hold a token, never a role.
 */
async function actor(uid: string | undefined, roles: Role[]) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
  const snapshot = await db.doc(`users/${uid}`).get();
  const data = snapshot.data();
  if (!data || data.status !== "active" || !roles.includes(data.role as Role)) {
    throw new HttpsError("permission-denied", "This account is not authorized.");
  }
  return {
    uid,
    name: String(data.fullName || data.email || "Authorized user"),
    role: data.role as Role,
  };
}

async function recordAdminAudit(
  current: { uid: string; name: string },
  values: { action: "created" | "updated" | "status-changed"; entityId: string; entityLabel: string; description: string },
) {
  await db.collection("auditTrail").add({
    ...values,
    entityType: "staff-account",
    createdBy: current.uid,
    createdByName: current.name,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Bootstraps the first administrator(s): when a registered account matches the
 * allowlist, it is promoted to admin and given a matching custom claim.
 * There is no insecure public bootstrap form.
 */
export const bootstrapInitialAdmin = onDocumentCreated(
  { document: "users/{uid}", region: REGION },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const profile = snapshot.data();
    const allowlist = initialAdminEmails
      .value()
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!allowlist.includes(String(profile.email || "").toLowerCase())) return;
    const uid = event.params.uid;
    await Promise.all([
      snapshot.ref.update({ role: "admin", updatedAt: FieldValue.serverTimestamp() }),
      getAuth().setCustomUserClaims(uid, { role: "admin" }),
    ]);
  },
);

/**
 * Notifies the farm team whenever a customer places an order.
 *
 * The notification is delivered to a configurable webhook (WhatsApp / email /
 * chat service of your choice) by setting `NOTIFICATION_WEBHOOK_URL`. When the
 * value is empty the function is a no-op, so nothing breaks out of the box.
 */
export const notifyOrderCreated = onDocumentCreated(
  { document: "orders/{orderId}", region: REGION },
  async (event) => {
    const webhook = notificationWebhook.value().trim();
    if (!webhook) return;
    const snapshot = event.data;
    if (!snapshot) return;
    const order = snapshot.data();
    const items = Array.isArray(order.items)
      ? order.items
          .map((item: { name?: string; quantity?: number }) => `${item.quantity ?? 1} × ${item.name ?? "item"}`)
          .join(", ")
      : "";
    const payload = {
      event: "order.created",
      reference: order.reference,
      customer: order.customer?.name || "Guest",
      phone: order.customer?.phone || "",
      total: order.total,
      fulfillment: order.fulfillment,
      items,
      trackingUrl: `/track`,
    };
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      /* notification delivery is best-effort */
    });
  },
);

/**
 * Public order tracking by TB-XXXXXX reference.
 *
 * Guests cannot read the `orders` collection directly (Firestore rules limit
 * reads to staff), so tracking goes through this callable. It returns only the
 * details a customer may see — never phone, email or the delivery signature.
 */
export const trackOrder = onCall({ region: REGION }, async (request) => {
  const input = z
    .object({ reference: z.string().trim().min(1).max(40) })
    .parse(request.data ?? {});
  const reference = input.reference.toUpperCase();

  const snapshot = await db
    .collection("orders")
    .where("reference", "==", reference)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];
  if (!doc) {
    throw new HttpsError("not-found", "No order with that reference.");
  }
  const order = doc.data() as Record<string, unknown>;
  const asIso = (value: unknown) => {
    if (!value) return null;
    if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate().toISOString();
    }
    if (typeof value === "object" && value && "seconds" in value) {
      return new Date(Number(value.seconds) * 1000).toISOString();
    }
    return String(value);
  };
  const items = Array.isArray(order.items)
    ? order.items.map((item: Record<string, unknown>) => ({
        name: String(item.name ?? "Item"),
        quantity: Number(item.quantity ?? 1),
        unit: typeof item.unit === "string" ? item.unit : "",
        price: typeof item.price === "number" ? item.price : 0,
      }))
    : [];
  const customer = (order.customer || {}) as Record<string, unknown>;

  return {
    reference: String(order.reference ?? reference),
    status: String(order.status ?? "pending"),
    paymentStatus: String(order.paymentStatus ?? "unpaid"),
    subtotal: Number(order.subtotal ?? 0),
    deliveryFee: Number(order.deliveryFee ?? 0),
    total: Number(order.total ?? 0),
    fulfillment: String(order.fulfillment ?? "pickup"),
    items,
    customerName: typeof customer.name === "string" ? customer.name : "",
    deliveryAddress: typeof order.deliveryAddress === "string" ? order.deliveryAddress : undefined,
    deliveryLocation: typeof order.deliveryLocation === "string" ? order.deliveryLocation : undefined,
    notes: typeof order.notes === "string" ? order.notes : undefined,
    paymentMethod: typeof order.paymentMethod === "string" ? order.paymentMethod : undefined,
    createdAt: asIso(order.createdAt),
    updatedAt: asIso(order.updatedAt),
  };
});

/** Workspace areas an administrator can grant to a staff member. */
const STAFF_PERMISSIONS = [
  "Farm Operations",
  "Animals",
  "Reports",
  "Orders",
  "Products",
  "Customers",
  "Media",
  "Documents",
  "Photos",
  "Videos",
  "Gallery",
] as const;

/** Administrator updates the explicit area permissions of a member. */
export const setUserPermissions = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z
    .object({
      uid: z.string().min(10).max(128),
      permissions: z.array(z.enum(STAFF_PERMISSIONS)).max(20),
    })
    .parse(request.data);
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  await ref.update({
    permissions: Array.from(new Set(input.permissions)),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await recordAdminAudit(current, {
    action: "updated",
    entityId: input.uid,
    entityLabel: String(target.data()?.fullName || input.uid),
    description: `Updated staff permissions: ${input.permissions.join(", ") || "no workspace areas"}.`,
  });
  return { ok: true };
});

export const setUserRole = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ uid: z.string().min(10).max(128), role: z.enum(VALID_ROLES) }).parse(request.data);
  if (input.uid === current.uid) throw new HttpsError("failed-precondition", "Administrators cannot change their own role.");
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const existing = await getAuth().getUser(input.uid);
  // Keep saved permissions in step with the role: admins hold everything.
  const currentPermissions = (target.data()?.permissions as string[] | undefined) || [];
  const permissions = input.role === "admin" ? [...STAFF_PERMISSIONS] : currentPermissions;
  await Promise.all([
    ref.update({ role: input.role, permissions, updatedAt: FieldValue.serverTimestamp() }),
    getAuth().setCustomUserClaims(input.uid, { ...existing.customClaims, role: input.role }),
  ]);
  await recordAdminAudit(current, {
    action: "updated",
    entityId: input.uid,
    entityLabel: String(target.data()?.fullName || input.uid),
    description: `Changed account role to ${input.role}.`,
  });
  return { ok: true };
});

export const setUserStatus = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ uid: z.string().min(10).max(128), status: z.enum(["active", "disabled"]) }).parse(request.data);
  if (input.uid === current.uid) throw new HttpsError("failed-precondition", "Administrators cannot disable themselves.");
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  await Promise.all([
    ref.update({ status: input.status, updatedAt: FieldValue.serverTimestamp() }),
    getAuth().updateUser(input.uid, { disabled: input.status === "disabled" }),
  ]);
  await recordAdminAudit(current, {
    action: "status-changed",
    entityId: input.uid,
    entityLabel: String(target.data()?.fullName || input.uid),
    description: `Changed staff account status to ${input.status}.`,
  });
  return { ok: true };
});

/**
 * Admin provisions a new staff/admin account directly. Firebase Authentication
 * remains the identity system; the profile is the source of truth.
 */
export const createStaffAccount = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z
    .object({
      fullName: z.string().trim().min(2).max(100),
      email: z.string().trim().toLowerCase().email().max(200),
      phone: z.string().trim().min(8).max(24),
      title: z.string().trim().max(100).optional().default(""),
      role: z.enum(["staff", "admin"]),
      permissions: z.array(z.enum(STAFF_PERMISSIONS)).max(20).optional().default([]),
    })
    .parse(request.data);

  // Admins implicitly hold every permission; staff get exactly what was ticked.
  const permissions =
    input.role === "admin" ? [...STAFF_PERMISSIONS] : Array.from(new Set(input.permissions));

  const tempPassword = `TBF-${randomBytes(6).toString("hex").slice(0, 10)}`;
  const user = await getAuth().createUser({
    email: input.email,
    emailVerified: false,
    password: tempPassword,
    displayName: input.fullName,
  });

  await Promise.all([
    getAuth().setCustomUserClaims(user.uid, { role: input.role }),
    db.doc(`users/${user.uid}`).set({
      uid: user.uid,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      title: input.title,
      role: input.role,
      permissions,
      status: "active",
      createdBy: current.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  ]);
  await recordAdminAudit(current, {
    action: "created",
    entityId: user.uid,
    entityLabel: input.fullName,
    description: `Created ${input.role} account for ${input.fullName}.`,
  });

  return { uid: user.uid, tempPassword };
});
