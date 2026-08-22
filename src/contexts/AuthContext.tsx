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
import { auth, db, firebaseConfigured } from "@/lib/firebase/config";
import {
  loginUser,
  logoutUser,
  registerUser,
  resetUserPassword,
} from "@/lib/firebase/auth";
import { DEFAULT_STAFF_PERMISSIONS, STAFF_PERMISSIONS } from "@/lib/constants";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  /** Effective permissions for the signed-in member (admins get everything). */
  permissions: string[];
  /** True when the signed-in member may use the given workspace area. */
  can: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  register: (values: { fullName: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileFromFirebaseUser(current: FirebaseUser, customRole?: "user" | "staff" | "admin"): UserProfile {
  return {
    uid: current.uid,
    fullName: current.displayName || "Member",
    email: current.email || "",
    phone: "",
    role: customRole || "user",
    status: "active",
    createdAt: null,
    updatedAt: null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    // A Firebase configuration is optional for the public/demo storefront.
    // Most read paths provide local demo data, so an unconfigured deployment
    // should render normally instead of trying to subscribe with an invalid
    // Auth handle.
    if (!firebaseConfigured) return;

    let stopProfile: (() => void) | undefined;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    const stopAuth = onAuthStateChanged(auth, async (current) => {
      stopProfile?.();
      stopProfile = undefined;
      setFirebaseUser(current);

      if (!current) {
        setUser(null);
        setLoading(false);
        return;
      }

      let tokenRole: "user" | "staff" | "admin" = "user";
      try {
        const tokenResult = await current.getIdTokenResult();
        if (tokenResult.claims.role === "admin" || tokenResult.claims.admin === true) {
          tokenRole = "admin";
        } else if (tokenResult.claims.role === "staff") {
          tokenRole = "staff";
        }
      } catch {
        // Token read fallback
      }

      // A signed-in Firebase user is a real session even before the Firestore
      // profile snapshot arrives (or if that document is still being created).
      setUser((existing) => (existing?.uid === current.uid ? existing : profileFromFirebaseUser(current, tokenRole)));

      try {
        stopProfile = onSnapshot(
          doc(db, "users", current.uid),
          (snapshot) => {
            if (cancelled) return;
            if (snapshot.exists()) {
              const data = snapshot.data();
              const profileRole =
                (data.role as "user" | "staff" | "admin") || tokenRole;
              const profile = { uid: snapshot.id, ...data, role: profileRole } as UserProfile;
              setUser(profile.status === "disabled" ? null : profile);
            } else {
              setUser(profileFromFirebaseUser(current, tokenRole));
            }
            setLoading(false);
          },
          () => {
            if (cancelled) return;
            setUser(profileFromFirebaseUser(current, tokenRole));
            setLoading(false);
          },
        );
      } catch {
        setUser(profileFromFirebaseUser(current, tokenRole));
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

  const permissions = useMemo<string[]>(() => {
    if (!user) return [];
    if (user.role === "admin") return [...STAFF_PERMISSIONS];
    if (user.role !== "staff") return [];
    const saved = (user.permissions || []).filter(Boolean);
    return saved.length ? saved : [...DEFAULT_STAFF_PERMISSIONS];
  }, [user]);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      return permissions.includes(permission);
    },
    [user, permissions],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      isAdmin: user?.role === "admin",
      isStaff: user?.role === "staff" || user?.role === "admin",
      permissions,
      can,
      login,
      register,
      logout,
      resetPassword: resetUserPassword,
      refreshToken,
    }),
    [user, firebaseUser, loading, permissions, can, login, register, logout, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
