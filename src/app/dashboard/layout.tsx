"use client";

import { Bell, FileText, LayoutDashboard, PackageSearch, ShoppingBag, UserRound } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "My orders", icon: PackageSearch },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={["user", "staff", "admin"]}><DashboardShell title="My farm account" subtitle="Orders, documents and updates in one place." nav={nav} roleLabel="Customer portal">{children}</DashboardShell></ProtectedRoute>;
}
