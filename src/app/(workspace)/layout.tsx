"use client";

import {
  Activity as ActivityIcon,
  Clapperboard,
  FileText,
  LayoutDashboard,
  Package,
  PawPrint,
  Settings,
  ShoppingBag,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  const nav: DashboardNavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/animals", label: "Animals", icon: PawPrint },
    { href: "/health", label: "Animal health", icon: Stethoscope },
    ...(isAdmin ? [{ href: "/staff", label: "Staff", icon: UsersRound }] : []),
    { href: "/documents", label: "Farm documents", icon: FileText },
    { href: "/activity", label: "Activity", icon: ActivityIcon },
    ...(isAdmin
      ? [{ href: "/orders", label: "Orders", icon: ShoppingBag }]
      : []),
    { href: "/products", label: "Products", icon: Package },
    { href: "/videos/manage", label: "Videos", icon: Clapperboard },
    ...(isAdmin ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <ProtectedRoute roles={["staff", "admin"]}>
      <DashboardShell
        title="Farm management"
        subtitle="Livestock, animal health, staff, documents and activity — the whole operation in one place."
        nav={nav}
        roleLabel={isAdmin ? "Administrator" : "Staff"}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
