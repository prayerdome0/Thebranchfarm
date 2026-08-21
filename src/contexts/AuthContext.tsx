"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import {
  loginUser,
  logoutUser,
  registerUser,
  resetUserPassword,
} from "@/lib/firebase/auth";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  register: (values: { fullName: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromFirebaseUser(current: FirebaseUser): UserProfile {
  return {
    uid: current.uid,
    fullName: current.displayName || "Customer",
    email: current.email || "",
    phone: "",
    role: "user",
    status: "active",
    createdAt: null,
    updatedAt: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const stopAuth = onAuthStateChanged(auth, (current) => {
      stopProfile?.();
      stopProfile = undefined;
      setFirebaseUser(current);

      if (!current) {
        setUser(null);
        setLoading(false);
        return;
      }

      // A signed-in Firebase user is a real session even before the Firestore
      // profile snapshot arrives (or if that document is still being created).
      setUser((existing) => existing?.uid === current.uid ? existing : profileFromFirebaseUser(current));

      try {
        stopProfile = onSnapshot(
          doc(db, "users", current.uid),
          (snapshot) => {
            if (cancelled) return;
            if (snapshot.exists()) {
              const profile = { uid: snapshot.id, ...snapshot.data() } as UserProfile;
              setUser(profile.status === "disabled" ? null : profile);
            } else {
              setUser(profileFromFirebaseUser(current));
            }
            setLoading(false);
          },
          () => {
            if (cancelled) return;
            setUser(profileFromFirebaseUser(current));
            setLoading(false);
          },
        );
      } catch {
        setUser(profileFromFirebaseUser(current));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      try { stopProfile?.(); } catch { /* ignore */ }
      try { stopAuth(); } catch { /* ignore */ }
    };
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      if (!auth.currentUser) return null;
      return await auth.currentUser.getIdToken(true);
    } catch {
      return null;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await loginUser(email, password);
    if (profile) {
      setUser(profile);
      setLoading(false);
    }
    return profile;
  }, []);

  const register = useCallback(async (values: { fullName: string; email: string; phone: string; password: string }) => {
    const profile = await registerUser(values);
    setUser(profile);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setFirebaseUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isAdmin: user?.role === "admin",
      isStaff: user?.role === "staff" || user?.role === "admin",
      login,
      register,
      logout,
      resetPassword: resetUserPassword,
      refreshToken,
    }),
    [user, firebaseUser, loading, login, register, logout, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
