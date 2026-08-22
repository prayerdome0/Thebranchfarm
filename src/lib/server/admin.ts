import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Server-side Firebase Admin access for the Next.js API routes.
 *
 * Admin is optional: when FIREBASE_ADMIN_* credentials are present the routes
 * read/write the live Firestore; without them the routes fall back to the
 * platform's Application Default Credentials — on Firebase App Hosting /
 * Cloud Run these are provisioned automatically (together with the auto
 * injected FIREBASE_CONFIG), so the authenticated API routes work with zero
 * manual configuration. Only when neither source yields a working Admin SDK
 * do protected routes answer 503 so the client keeps using its direct
 * Firestore path. Nothing breaks without a backend.
 */

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface AdminBundle {
  app: App;
  db: Firestore;
  auth: Auth;
}

let bundle: AdminBundle | null = null;
let attempted = false;

function credentials() {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function adminConfigured() {
  return Boolean(credentials());
}

export function getAdmin(): AdminBundle | null {
  if (bundle) return bundle;
  if (attempted) return null;
  attempted = true;

  const build = (appId: string, makeOpts: () => Record<string, unknown>): AdminBundle | null => {
    try {
      const app =
        getApps().find((existing) => existing.name === appId) ||
        initializeApp(makeOpts() as never, appId);
      return { app, db: getFirestore(app), auth: getAuth(app) };
    } catch {
      return null;
    }
  };

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "thebranchfarm.firebasestorage.app";

  // 1) Explicit service-account credentials from the environment (Vercel,
  //    local dev, any host where FIREBASE_ADMIN_* is set).
  const creds = credentials();
  if (creds) {
    bundle =
      build("thebranchfarm-api", () => ({
        credential: cert(creds),
        storageBucket,
      })) ?? null;
    if (bundle) return bundle;
  }

  // 2) Application Default Credentials. Firebase App Hosting (Cloud Run)
  //    provisions these automatically and injects FIREBASE_CONFIG, so the
  //    Admin SDK works there with no environment configuration at all.
  //    Elsewhere (e.g. a laptop without `gcloud auth`) this simply fails and
  //    we keep the documented 503 behaviour.
  bundle =
    build("thebranchfarm-adc", () => {
      const projectId =
        process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      return {
        ...(projectId ? { projectId } : {}),
        credential: applicationDefault(),
        storageBucket,
      };
    }) ?? null;
  return bundle;
}

export interface Actor {
  uid: string;
  name: string;
  role: "user" | "staff" | "admin";
}

/**
 * Verifies a `Authorization: Bearer <firebase id token>` header against
 * Firebase Auth and the caller's Firestore profile — the same trust model the
 * callable functions use.
 */
export async function requireStaff(
  request: Request,
  roles: Array<"staff" | "admin"> = ["staff", "admin"],
): Promise<{ db: Firestore; auth: Auth; actor: Actor }> {
  const admin = getAdmin();
  if (!admin) {
    throw new ApiError(
      503,
      "The API is running without Firebase Admin credentials. Set FIREBASE_ADMIN_* to enable protected endpoints.",
    );
  }
  const header = request.headers.get("authorization") || "";
  const fromHeader = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Printable pages (e.g. /api/quotations/:id/print) are opened in a new
  // browser tab where a custom header is not possible — allow the ID token
  // as a query parameter for those GET endpoints.
  const fromQuery = new URL(request.url).searchParams.get("token") || "";
  const token = fromHeader || fromQuery;
  if (!token) throw new ApiError(401, "Sign in is required. Pass an Authorization: Bearer <id token> header.");
  try {
    const decoded = await admin.auth.verifyIdToken(token);

    // The Firestore profile is the primary role source, but the read can fail
    // for infrastructure reasons (e.g. the runtime service account has not
    // been granted Firestore access yet). Custom claims are set only by
    // trusted server code, so they remain a valid role source on their own.
    let data: Record<string, unknown> | undefined;
    let profileReadFailed = false;
    try {
      const profile = await admin.db.doc(`users/${decoded.uid}`).get();
      data = profile.data();
    } catch {
      profileReadFailed = true;
    }

    // Check role from claims, Firestore profile, and initial admin email allowlist
    const claimsRole =
      decoded.role === "admin" || decoded.admin === true
        ? "admin"
        : decoded.role === "staff"
          ? "staff"
          : undefined;

    const initialEmails = (process.env.INITIAL_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const email = String(decoded.email || data?.email || "").toLowerCase();
    const isInitialAdmin = email ? initialEmails.includes(email) : false;

    const role: Actor["role"] =
      (data?.role as Actor["role"]) ||
      claimsRole ||
      (isInitialAdmin ? "admin" : "user");

    const status = (data?.status as string) || (decoded.disabled ? "disabled" : "active");
    if (status !== "active" || !roles.includes(role as "staff" | "admin")) {
      if (profileReadFailed) {
        throw new ApiError(
          502,
          "Your account was verified, but its farm profile could not be read. Grant the server's service account access to Firestore (or set FIREBASE_ADMIN_* credentials), then try again.",
        );
      }
      throw new ApiError(403, "This account is not authorized for this action.");
    }

    // Ensure Firestore profile and custom claims stay in sync if promoted as admin
    if (!profileReadFailed && (isInitialAdmin || claimsRole === "admin") && data?.role !== "admin") {
      admin.db.doc(`users/${decoded.uid}`).set({ role: "admin" }, { merge: true }).catch(() => {});
      admin.auth.setCustomUserClaims(decoded.uid, { role: "admin" }).catch(() => {});
    }

    return {
      db: admin.db,
      auth: admin.auth,
      actor: {
        uid: decoded.uid,
        name: String(data?.fullName || decoded.name || "Team member"),
        role,
      },
    };
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    throw new ApiError(401, "Your session could not be verified. Sign in again and retry.");
  }
}

export function errorResponse(cause: unknown) {
  if (cause instanceof ApiError) {
    return Response.json({ error: cause.message }, { status: cause.status });
  }
  console.error("[api]", cause);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
