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

// The Firebase web identifiers for the production `thebranchfarm` app.
//
// These are PUBLIC client configuration, not secrets — every visitor's
// browser receives them with the JavaScript bundle (they are also committed
// in apphosting.yaml). Authorization is enforced by Auth, Firestore Rules and
// callable functions — never by keeping this object secret.
//
// They act as the default configuration when the NEXT_PUBLIC_FIREBASE_*
// environment variables are absent (local development, previews, or a
// deployment where the variables were never set). This is what makes sign-in
// work out of the box instead of failing with "Firebase Authentication is not
// fully configured yet." Environment variables still win per key, so pointing
// the app at a different project requires no code changes.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBKPQDWy2wXKZL0Ffzk2zMbORxmIv_dKq0",
  authDomain: "thebranchfarm.firebaseapp.com",
  projectId: "thebranchfarm",
  storageBucket: "thebranchfarm.firebasestorage.app",
  messagingSenderId: "971662070100",
  appId: "1:971662070100:web:f4406c1e90de3ccc9678c1",
};

function isPlaceholder(value: string) {
  return /^(your[_-]|<|\[|replace[_-]?me)/i.test(value);
}

/** Env-var suffix, e.g. "API_KEY" → NEXT_PUBLIC_FIREBASE_API_KEY. */
function configuredValue(key: string, fallback: string) {
  const raw = process.env[`NEXT_PUBLIC_FIREBASE_${key}`]?.trim() || "";
  if (!raw || isPlaceholder(raw)) return fallback;
  return raw;
}

const firebaseConfig = {
  apiKey: configuredValue("API_KEY", DEFAULT_FIREBASE_CONFIG.apiKey),
  authDomain: configuredValue("AUTH_DOMAIN", DEFAULT_FIREBASE_CONFIG.authDomain),
  projectId: configuredValue("PROJECT_ID", DEFAULT_FIREBASE_CONFIG.projectId),
  storageBucket: configuredValue("STORAGE_BUCKET", DEFAULT_FIREBASE_CONFIG.storageBucket),
  messagingSenderId: configuredValue("MESSAGING_SENDER_ID", DEFAULT_FIREBASE_CONFIG.messagingSenderId),
  appId: configuredValue("APP_ID", DEFAULT_FIREBASE_CONFIG.appId),
};

// Only true for deployments that point at some other project but left the
// environment incomplete. The default configuration above is always complete,
// so authentication works everywhere without any environment setup.
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
