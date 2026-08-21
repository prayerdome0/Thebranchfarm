import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function credential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) return cert({ projectId, clientEmail, privateKey });
  return applicationDefault();
}

export function getAdminApp() {
  return getApps()[0] || initializeApp({
    credential: credential(),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export async function requireAuthorizedUser(request: Request, roles: Array<"staff" | "admin">) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("unauthenticated");
  const token = await getAuth(getAdminApp()).verifyIdToken(header.slice(7));
  const profile = await getFirestore(getAdminApp()).doc(`users/${token.uid}`).get();
  const role = profile.data()?.role as "user" | "staff" | "admin" | undefined;
  const status = profile.data()?.status;
  if (!role || !roles.includes(role as "staff" | "admin") || status === "disabled") {
    throw new Error("permission-denied");
  }
  return { token, role };
}
