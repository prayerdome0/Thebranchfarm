import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
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
  const credential = await createUserWithEmailAndPassword(auth, input.email, input.password);
  await updateProfile(credential.user, { displayName: input.fullName });
  const profile = {
    uid: credential.user.uid,
    fullName: input.fullName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    role: "user" as const,
    status: "active" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", credential.user.uid), profile);
  return profile;
}

export async function loginUser(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profileRef = doc(db, "users", credential.user.uid);
  const snapshot = await getDoc(profileRef);
  if (!snapshot.exists()) {
    // Recovery path for older Auth users. Security Rules only permit a user-role profile.
    await setDoc(profileRef, {
      uid: credential.user.uid,
      fullName: credential.user.displayName || "Customer",
      email: credential.user.email || email,
      phone: "",
      role: "user",
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await updateDoc(profileRef, { lastLoginAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return credential.user;
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
