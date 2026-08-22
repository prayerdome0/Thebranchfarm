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
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/contexts/AuthContext";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, can } = useAuth();
  const pathname = usePathname();

  // Final private structure per spec:
  // Dashboard, Orders, Products, Animals (Health Records), Customers, Farm Media (Photos, Videos), Staff, Documents (Quotations, Invoices, Receipts, etc), Settings
  const allNav: (DashboardNavItem & { permission?: string; adminOnly?: boolean })[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ShoppingBag, permission: "Orders" },
    { href: "/products", label: "Products", icon: Package, permission: "Products" },
    { href: "/animals", label: "Animals", icon: PawPrint, permission: "Animals" },
    { href: "/health", label: "Health Records", icon: Stethoscope, permission: "Animals" },
    { href: "/customers", label: "Customers", icon: UsersRound, permission: "Customers" },
    { href: "/media", label: "Farm Media", icon: Images, permission: "Media" },
    { href: "/videos/manage", label: "Videos", icon: Video, permission: "Videos" },
    { href: "/staff", label: "Staff", icon: UsersRound, adminOnly: true },
    { href: "/documents", label: "Documents", icon: FileText, permission: "Documents" },
    { href: "/documents/quotations", label: "Quotations", icon: FileStack, permission: "Documents" },
    { href: "/documents/invoices", label: "Invoices", icon: FileText, permission: "Documents" },
    { href: "/documents/receipts", label: "Receipts", icon: FileText, permission: "Documents" },
    { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
  ];

  // Staff only see the areas an administrator granted them.
  const nav: DashboardNavItem[] = allNav
    .filter((item) => (item.adminOnly ? isAdmin : !item.permission || can(item.permission)))
    .map(({ permission: _permission, adminOnly: _adminOnly, ...item }) => item);



  // The nav is filtered, but a staff member could still type a URL — so the
  // page itself is gated on the same permission.
  const activePermission = allNav
    .filter((item) => item.permission)
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.permission;

  return (
    <ProtectedRoute roles={["staff", "admin"]} permission={activePermission}>
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
