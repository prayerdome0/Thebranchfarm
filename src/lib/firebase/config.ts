import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

// Firebase web identifiers come ONLY from server-provided environment
// variables — no credentials are hardcoded in this repository. Authorization
// is enforced by Auth, Firestore Rules and callable functions — never by
// keeping this object secret. Deployments may set NEXT_PUBLIC_FIREBASE_*
// (see .env.example); without them the storefront falls back to demo data.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || "",
};

function isPlaceholder(value: string) {
  return /^(your[_-]|<|\[|replace[_-]?me)/i.test(value);
}

// Do not let an unset (or copied, placeholder) environment variable create a
// Firebase app. `initializeApp({ apiKey: "" })` succeeds, but `getAuth()`
// validates the key immediately and throws during Next.js prerendering. The
// client modules still import the typed SDK handles below; they remain inert
// until a real Firebase configuration is available.
export const firebaseConfigured =
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) &&
  !isPlaceholder(firebaseConfig.apiKey) &&
  !isPlaceholder(firebaseConfig.projectId);

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let functionsInstance: Functions | undefined;

function configurationError(): Error & { code: string } {
  const error = new Error(
    "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* environment variables to enable live data.",
  ) as Error & { code: string };
  error.code = "auth/configuration-not-found";
  return error;
}

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured) throw configurationError();
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!firebaseConfigured) throw configurationError();
  if (authInstance) return authInstance;
  const firebaseApp = getFirebaseApp();
  if (typeof window === "undefined") {
    authInstance = getAuth(firebaseApp);
    return authInstance;
  }
  try {
    authInstance = initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    // HMR / Fast Refresh can re-evaluate this module after Auth is already live.
    authInstance = getAuth(firebaseApp);
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!firebaseConfigured) throw configurationError();
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

export function getFirebaseFunctions(): Functions {
  if (!firebaseConfigured) throw configurationError();
  if (functionsInstance) return functionsInstance;
  functionsInstance = getFunctions(
    getFirebaseApp(),
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION?.trim() || "us-central1",
  );
  return functionsInstance;
}

// Real SDK instances when Firebase is configured. When it is not configured,
// these typed placeholders deliberately contain no SDK object: this prevents
// module evaluation from contacting or validating Firebase during a static
// build. Read paths already catch backend failures and use demo/local data;
// auth and write paths report a configuration error when a user invokes them.
// Do not wrap real SDK instances in a Proxy — Firebase uses `instanceof`.
export const app: FirebaseApp = firebaseConfigured
  ? getFirebaseApp()
  : (undefined as unknown as FirebaseApp);
export const auth: Auth = firebaseConfigured
  ? getFirebaseAuth()
  : (undefined as unknown as Auth);
export const db: Firestore = firebaseConfigured
  ? getFirebaseDb()
  : (undefined as unknown as Firestore);
export const functions: Functions = firebaseConfigured
  ? getFirebaseFunctions()
  : (undefined as unknown as Functions);
