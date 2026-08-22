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
// keeping this object secret. Deployments must set NEXT_PUBLIC_FIREBASE_*
// (see .env.example); without them the storefront falls back to demo data.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let appInstance: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let functionsInstance: Functions | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

export function getFirebaseAuth(): Auth {
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
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

export function getFirebaseFunctions(): Functions {
  if (functionsInstance) return functionsInstance;
  functionsInstance = getFunctions(
    getFirebaseApp(),
    process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1",
  );
  return functionsInstance;
}

// Real SDK instances. Do not wrap these in a Proxy — Firebase uses
// `instanceof Auth/Firestore/Functions` and a Proxy throws `invalid-argument`,
// which the UI mapped to "Please review the information and try again."
export const app = getFirebaseApp();
export const auth = getFirebaseAuth();
export const db = getFirebaseDb();
export const functions = getFirebaseFunctions();
