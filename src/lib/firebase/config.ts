import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Firebase web identifiers are intentionally client-visible. Authorization is enforced by
// Auth, Firestore Rules and callable functions — never by keeping this object secret.
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
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(
  app,
  process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || "us-central1",
);
