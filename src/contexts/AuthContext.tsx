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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    let timeout: number | undefined;
    // Safety: never leave UI stuck on "Checking your access…" on Vercel if Firebase is unreachable.
    timeout = window.setTimeout(() => setLoading(false), 4000) as unknown as number;

    let stopAuth: (() => void) | undefined;
    try {
      stopAuth = onAuthStateChanged(
        auth,
        (current) => {
          stopProfile?.();
          stopProfile = undefined;
          setFirebaseUser(current);
          if (!current) {
            setUser(null);
            setLoading(false);
            if (timeout) window.clearTimeout(timeout);
            return;
          }

          try {
            stopProfile = onSnapshot(
              doc(db, "users", current.uid),
              (snapshot) => {
                if (snapshot.exists()) {
                  const profile = { uid: snapshot.id, ...snapshot.data() } as UserProfile;
                  setUser(profile.status === "disabled" ? null : profile);
                } else {
                  setUser(null);
                }
                setLoading(false);
                if (timeout) window.clearTimeout(timeout);
              },
              () => {
                setUser(null);
                setLoading(false);
                if (timeout) window.clearTimeout(timeout);
              }
            );
          } catch {
            setUser(null);
            setLoading(false);
            if (timeout) window.clearTimeout(timeout);
          }
        },
        () => {
          setUser(null);
          setLoading(false);
          if (timeout) window.clearTimeout(timeout);
        }
      );
    } catch {
      setLoading(false);
      if (timeout) window.clearTimeout(timeout);
    }

    return () => {
      if (timeout) window.clearTimeout(timeout);
      try { stopProfile?.(); } catch {}
      try { stopAuth?.(); } catch {}
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

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isAdmin: user?.role === "admin",
      isStaff: user?.role === "staff" || user?.role === "admin",
      login: async (email, password) => loginUser(email, password),
      register: async (values) => {
        await registerUser(values);
      },
      logout: logoutUser,
      resetPassword: resetUserPassword,
      refreshToken,
    }),
    [user, firebaseUser, loading, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
