import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";
import type { UserProfile } from "@/types";

export async function registerUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  // Firebase and the user profile must use the same canonical email. This also
  // keeps the Firestore create rule from rejecting otherwise valid sign-ups
  // when a visitor enters spaces or capital letters.
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  let credential: UserCredential | null = null;

  try {
    credential = await createUserWithEmailAndPassword(auth, email, input.password);
    await updateProfile(credential.user, { displayName: fullName });
    const profile = {
      uid: credential.user.uid,
      fullName,
      email,
      phone,
      role: "user" as const,
      status: "active" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, "users", credential.user.uid), profile);
    return profile;
  } catch (error) {
    // Do not leave an Auth-only account behind if profile creation fails. A
    // later retry should be able to use the same email address.
    if (credential) {
      try { await deleteUser(credential.user); } catch {}
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string): Promise<UserProfile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const profileRef = doc(db, "users", credential.user.uid);
  let snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    // Recovery path for older Auth users. Security Rules only permit a user-role profile.
    await setDoc(profileRef, {
      uid: credential.user.uid,
      fullName: credential.user.displayName || "Customer",
      email: credential.user.email || normalizedEmail,
      phone: "",
      role: "user",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    snapshot = await getDoc(profileRef);
  }
  await updateDoc(profileRef, { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserProfile) : null;
}

export function logoutUser() {
  return signOut(auth);
}

export function resetUserPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
}
