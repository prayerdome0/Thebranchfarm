"use client";

import Link from "next/link";
import { Clock, LockKeyhole } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loading } from "@/components/ui/Loading";
import type { AppRole } from "@/types";

export function ProtectedRoute({
  roles,
  permission,
  children,
}: {
  roles: AppRole[];
  /** Optional area permission (e.g. "Orders") the member must have. */
  permission?: string;
  children: React.ReactNode;
}) {
  const { user, loading, can } = useAuth();
  const pathname = usePathname();
  if (loading) {
    return (
      <div className="protected-loading">
        <Loading label="Checking your access…" />
      </div>
    );
  }
  if (!user) {
    return (
      <section className="access-state page-shell">
        <span><LockKeyhole size={28} /></span>
        <h1>Sign in required</h1>
        <p>Please sign in to access the farm workspace.</p>
        <Link className="button button-primary" href={`/login?next=${encodeURIComponent(pathname)}`}>
          Sign in
        </Link>
      </section>
    );
  }
  if (user.role === "user") {
    return (
      <section className="access-state page-shell">
        <span><Clock size={28} /></span>
        <h1>Awaiting approval</h1>
        <p>
          Your account is registered, but a farm administrator still needs to grant you access.
          Please contact the farm team if you were expecting to start work.
        </p>
      </section>
    );
  }
  if (!roles.includes(user.role) || (permission && !can(permission))) {
    return (
      <section className="access-state page-shell">
        <span><LockKeyhole size={28} /></span>
        <h1>Access not authorized</h1>
        <p>
          Your account does not have permission to view this area
          {permission ? ` (${permission})` : ""}. Ask a farm administrator to grant it on the Staff page.
        </p>
        <Link className="button button-secondary" href="/dashboard">
          Return to dashboard
        </Link>
      </section>
    );
  }
  return children;
}
