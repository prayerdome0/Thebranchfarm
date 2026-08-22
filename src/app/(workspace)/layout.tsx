"use client";

import {
  FileText,
  Images,
  LayoutDashboard,
  Package,
  PawPrint,
  Settings,
  ShoppingBag,
  Stethoscope,
  UsersRound,
  Video,
  FileStack,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  // Final private structure per spec:
  // Dashboard, Orders, Products, Animals (Health Records), Customers, Farm Media (Photos, Videos), Staff, Documents (Quotations, Invoices, Receipts, etc), Settings
  const nav: DashboardNavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/products", label: "Products", icon: Package },
    { href: "/animals", label: "Animals", icon: PawPrint },
    { href: "/health", label: "Health Records", icon: Stethoscope },
    { href: "/customers", label: "Customers", icon: UsersRound },
    { href: "/media", label: "Farm Media", icon: Images },
    { href: "/videos/manage", label: "Videos", icon: Video },
    ...(isAdmin ? [{ href: "/staff", label: "Staff", icon: UsersRound }] : []),
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/documents/quotations", label: "Quotations", icon: FileStack },
    { href: "/documents/invoices", label: "Invoices", icon: FileText },
    { href: "/documents/receipts", label: "Receipts", icon: FileText },
    ...(isAdmin ? [{ href: "/settings", label: "Settings", icon: Settings }] : []),
  ];

  return (
    <ProtectedRoute roles={["staff", "admin"]}>
      <DashboardShell
        title="The Branch Farm"
        subtitle="Admin dashboard - manage products, orders, customers, animals, media and documents. Nayi Plug."
        nav={nav}
        roleLabel={isAdmin ? "Administrator" : "Staff"}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
