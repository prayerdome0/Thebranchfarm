import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";
import type { UserProfile } from "@/types";

function profileFromAuth(user: User, extras?: Partial<UserProfile>): UserProfile {
  return {
    uid: user.uid,
    fullName: extras?.fullName || user.displayName || "Member",
    email: (extras?.email || user.email || "").trim().toLowerCase(),
    phone: extras?.phone || "",
    role: extras?.role || "user",
    status: extras?.status || "active",
    createdAt: extras?.createdAt ?? null,
    updatedAt: extras?.updatedAt ?? null,
  };
}

async function ensureIdToken(user: User) {
  try {
    await user.getIdToken(true);
  } catch {
    // Token refresh is best-effort; Firestore will retry with the current token.
  }
}

async function writeUserProfile(
  user: User,
  input: { fullName: string; email: string; phone: string },
) {
  const profile = {
    uid: user.uid,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    role: "user" as const,
    status: "active" as const,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "users", user.uid), profile);
  return profile;
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  const credential = await createUserWithEmailAndPassword(auth, email, input.password);
  if (fullName) {
    try {
      await updateProfile(credential.user, { displayName: fullName });
    } catch {
      // Display name is cosmetic; the Firestore profile is the source of truth.
    }
  }

  // Security rules compare the profile email to the Auth ID token email.
  await ensureIdToken(credential.user);

  try {
    await writeUserProfile(credential.user, { fullName, email, phone });
  } catch {
    // Keep the Firebase Auth account even if the first profile write fails.
    try {
      await ensureIdToken(credential.user);
      await writeUserProfile(credential.user, { fullName, email, phone });
    } catch {
      // Registration still succeeded: the member can sign in with this email.
    }
  }

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user).catch(() => {
      // The account remains usable for profile and locally placed orders;
      // verified email is required only for reading issued documents.
    });
  }

  return profileFromAuth(credential.user, { fullName, email, phone });
}

export async function loginUser(email: string, password: string): Promise<UserProfile | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
  const user = credential.user;
  const profileRef = doc(db, "users", user.uid);

  try {
    let snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      await ensureIdToken(user);
      await setDoc(profileRef, {
        uid: user.uid,
        fullName: user.displayName || "Member",
        email: (user.email || normalizedEmail).toLowerCase(),
        phone: "",
        role: "user",
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      snapshot = await getDoc(profileRef);
    } else {
      try {
        await updateDoc(profileRef, {
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // lastLoginAt must never block a successful Firebase sign-in.
      }
    }

    if (snapshot.exists()) {
      const profile = { uid: snapshot.id, ...snapshot.data() } as UserProfile;
      if (profile.status === "disabled") {
        await signOut(auth);
        const disabled = new Error("This account has been disabled. Please contact the farm administrator.");
        (disabled as Error & { code: string }).code = "auth/user-disabled";
        throw disabled;
      }
      return profile;
    }
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "auth/user-disabled") {
      throw error;
    }
    // Auth succeeded. Return a real session even if Firestore is briefly down.
  }

  return profileFromAuth(user, { email: normalizedEmail });
}

export function logoutUser() {
  return signOut(auth);
}

export function resetUserPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
}
