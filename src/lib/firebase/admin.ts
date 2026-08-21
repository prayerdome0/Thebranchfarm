import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function credential() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  // Vercel env may contain literal \n or already-unescaped newlines — handle both.
  const privateKey = rawKey?.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  if (projectId && clientEmail && privateKey && privateKey.includes("BEGIN PRIVATE KEY")) {
    return cert({ projectId, clientEmail, privateKey });
  }
  // On Vercel without admin secrets, applicationDefault() would crash (no GCP metadata).
  // Return null and let getAdminApp decide to init without credential — API routes will then
  // return 503/401 instead of crashing the whole Next server.
  return null;
}

export function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  const cred = credential();
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "thebranchfarm";
  try {
    return initializeApp(
      cred
        ? { credential: cred, projectId }
        : { projectId }
    );
  } catch (err) {
    // If ADC missing, initialize minimally — firestore/auth calls will throw but not crash build.
    // This prevents "This page couldn't load" on Vercel when admin env is absent.
    console.warn("[firebase-admin] init without credential:", (err as Error).message);
    try {
      return getApps()[0] ?? initializeApp({ projectId });
    } catch {
      return getApps()[0]!;
    }
  }
}

export async function requireAuthorizedUser(request: Request, roles: Array<"staff" | "admin">) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("unauthenticated");
  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch {
    throw new Error("unauthenticated");
  }
  const token = await getAuth(adminApp).verifyIdToken(header.slice(7));
  const profile = await getFirestore(adminApp).doc(`users/${token.uid}`).get();
  const role = profile.data()?.role as "user" | "staff" | "admin" | undefined;
  const status = profile.data()?.status;
  if (!role || !roles.includes(role as "staff" | "admin") || status === "disabled") {
    throw new Error("permission-denied");
  }
  return { token, role };
}
