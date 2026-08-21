"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn, initials } from "@/lib/utils";

export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

export function DashboardShell({ title, subtitle, nav, children, roleLabel }: {
  title: string;
  subtitle: string;
  nav: DashboardNavItem[];
  roleLabel: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="dashboard-frame">
      <aside className={cn("dashboard-sidebar", open && "dashboard-sidebar-open")}>
        <div className="dashboard-mobile-head">
          <strong>Workspace</strong>
          <button className="icon-button" onClick={() => setOpen(false)} aria-label="Close dashboard menu"><X size={20} /></button>
        </div>
        <div className="dashboard-user-card">
          <span className="dashboard-avatar">{initials(user?.fullName)}</span>
          <span><strong>{user?.fullName}</strong><small>{roleLabel}</small></span>
        </div>
        <nav aria-label={`${roleLabel} navigation`}>
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href} className={cn("dashboard-nav-link", active && "active")} onClick={() => setOpen(false)}>
                <Icon size={19} />
                <span>{item.label}</span>
                {item.badge != null && <small>{item.badge}</small>}
                <ChevronRight size={15} className="dashboard-nav-arrow" />
              </Link>
            );
          })}
        </nav>
        <button className="dashboard-sign-out" onClick={() => logout()}>
          <LogOut size={17} /> Sign out
        </button>
      </aside>
      {open && <button className="dashboard-scrim" aria-label="Close dashboard navigation" onClick={() => setOpen(false)} />}
      <section className="dashboard-content">
        <header className="dashboard-page-header">
          <button className="icon-button dashboard-menu-button" onClick={() => setOpen(true)} aria-label="Open dashboard navigation"><Menu size={21} /></button>
          <div><span className="eyebrow">{roleLabel}</span><h1>{title}</h1><p>{subtitle}</p></div>
        </header>
        {children}
      </section>
    </div>
  );
}
