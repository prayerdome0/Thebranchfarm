"use client";

import { Bell, Boxes, FileText, Images, LayoutDashboard, PackageCheck, PackageOpen, ScrollText, Settings, TrendingUp, UsersRound } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const nav = [
  { href: "/admin", label: "Command center", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: PackageCheck },
  { href: "/admin/products", label: "Products", icon: PackageOpen },
  { href: "/admin/content", label: "Content & gallery", icon: Images },
  { href: "/admin/users", label: "Users & staff", icon: UsersRound },
  { href: "/admin/farm", label: "Farm", icon: Boxes },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: TrendingUp },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={["admin"]}><DashboardShell title="Command center" subtitle="A complete view of the business and farm." nav={nav} roleLabel="Administrator">{children}</DashboardShell></ProtectedRoute>;
}
