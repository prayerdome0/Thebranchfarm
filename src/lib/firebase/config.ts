import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFunctions, type Functions } from "firebase/functions";

// Firebase web identifiers are intentionally client-visible. Authorization is enforced by
// Auth, Firestore Rules and callable functions — never by keeping this object secret.
// Fallback values keep Vercel previews and local builds working when env vars are missing.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBKPQDWy2wXKZL0Ffzk2zMbORxmIv_dKq0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "thebranchfarm.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "thebranchfarm",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "thebranchfarm.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "971662070100",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:971662070100:web:f4406c1e90de3ccc9678c1",
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

// Initialize once — safe for both client and server (prerender) and for Vercel's edge bundling.
let app: FirebaseApp;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch {
  // If initialization fails (e.g. duplicate init in edge runtime), reuse existing app.
  app = getApps()[0] ?? initializeApp(firebaseConfig);
}

// Lazily create Auth/Firestore/Functions so a misconfigured env never crashes SSR or Vercel's build.
// On the server during prerender these are inert; on the client they become live after hydration.
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _functions: Functions | null = null;

function getAuthSafe(): Auth {
  if (_auth) return _auth;
  try {
    _auth = getAuth(app);
  } catch {
    // Fallback dummy — callers must handle permission errors via friendlyError.
    _auth = null as unknown as Auth;
  }
  return _auth as Auth;
}

function getDbSafe(): Firestore {
  if (_db) return _db;
  try {
    _db = getFirestore(app);
  } catch {
    _db = null as unknown as Firestore;
  }
  return _db as Firestore;
}

function getFunctionsSafe(): Functions {
  if (_functions) return _functions;
  try {
    _functions = getFunctions(
      app,
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1"
    );
  } catch {
    _functions = null as unknown as Functions;
  }
  return _functions as Functions;
}

export { app };
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const real = getAuthSafe();
    // Allow `auth.currentUser` etc to be accessed even before init.
    const value = (real as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
}) ;
export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    const real = getDbSafe();
    const value = (real as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});
export const functions: Functions = new Proxy({} as Functions, {
  get(_target, prop) {
    const real = getFunctionsSafe();
    const value = (real as unknown as Record<string, unknown>)[prop as string];
    return typeof value === "function" ? (value as Function).bind(real) : value;
  },
});
