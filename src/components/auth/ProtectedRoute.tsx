"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/Loading";
import type { AppRole } from "@/types";

export function ProtectedRoute({ roles, children }: { roles: AppRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  if (loading) return <div className="protected-loading"><Loading label="Checking your access…" /></div>;
  if (!user) {
    return (
      <section className="access-state page-shell">
        <span><LockKeyhole size={28} /></span>
        <h1>Sign in required</h1>
        <p>Please sign in to access this secure area.</p>
        <Link className="button button-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
      </section>
    );
  }
  if (!roles.includes(user.role)) {
    return (
      <section className="access-state page-shell">
        <span><LockKeyhole size={28} /></span>
        <h1>Access not authorized</h1>
        <p>Your {user.role} account does not have permission to view this area.</p>
        <Link className="button button-secondary" href={user.role === "user" ? "/dashboard" : "/staff"}>Return to dashboard</Link>
      </section>
    );
  }
  return children;
}
