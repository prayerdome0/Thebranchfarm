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

export const setUserRole = onCall({ region: REGION }, async (request) => {
  const current = await actor(request.auth?.uid, ["admin"]);
  const input = z.object({ uid: z.string().min(10).max(128), role: z.enum(VALID_ROLES) }).parse(request.data);
  if (input.uid === current.uid) throw new HttpsError("failed-precondition", "Administrators cannot change their own role.");
  const ref = db.doc(`users/${input.uid}`);
  const target = await ref.get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const existing = await getAuth().getUser(input.uid);
  await Promise.all([
    ref.update({ role: input.role, updatedAt: FieldValue.serverTimestamp() }),
    getAuth().setCustomUserClaims(input.uid, { ...existing.customClaims, role: input.role }),
  ]);
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
    })
    .parse(request.data);

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
      status: "active",
      createdBy: current.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  ]);

  return { uid: user.uid, tempPassword };
});
