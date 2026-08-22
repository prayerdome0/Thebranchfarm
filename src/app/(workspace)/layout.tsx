"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileStack,
  FileText,
  HeartPulse,
  History,
  Images,
  LayoutDashboard,
  Milk,
  Package,
  PawPrint,
  ReceiptText,
  Repeat2,
  Scale,
  Settings,
  ShoppingBag,
  Stethoscope,
  UsersRound,
  Video,
  Wheat,
  Wrench,
  Egg,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceNavItem extends DashboardNavItem {
  permission?: string;
  adminOnly?: boolean;
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, can } = useAuth();
  const pathname = usePathname();

  const allNav: WorkspaceNavItem[] = [
    { href: "/dashboard", label: "Farm overview", icon: LayoutDashboard, section: "Overview" },
    { href: "/tasks", label: "My tasks", icon: ClipboardCheck, permission: "Farm Operations", section: "Overview" },
    { href: "/incidents", label: "Problems & incidents", icon: AlertTriangle, permission: "Farm Operations", section: "Overview" },

    { href: "/animals", label: "Animals", icon: PawPrint, permission: "Animals", section: "Livestock" },
    { href: "/health", label: "Health & vaccination", icon: Stethoscope, permission: "Animals", section: "Livestock" },
    { href: "/weights", label: "Weight & growth", icon: Scale, permission: "Farm Operations", section: "Livestock" },
    { href: "/breeding", label: "Breeding", icon: HeartPulse, permission: "Farm Operations", section: "Livestock" },
    { href: "/births", label: "Births", icon: Egg, permission: "Farm Operations", section: "Livestock" },
    { href: "/acquisitions", label: "Acquisitions", icon: PawPrint, permission: "Farm Operations", section: "Livestock" },
    { href: "/movements", label: "Sales & transfers", icon: Repeat2, permission: "Farm Operations", section: "Livestock" },

    { href: "/feed", label: "Feed management", icon: Wheat, permission: "Farm Operations", section: "Daily operations" },
    { href: "/inventory", label: "Farm inventory", icon: Boxes, permission: "Farm Operations", section: "Daily operations" },
    { href: "/milk-production", label: "Milk production", icon: Milk, permission: "Farm Operations", section: "Daily operations" },
    { href: "/egg-production", label: "Egg production", icon: Egg, permission: "Farm Operations", section: "Daily operations" },
    { href: "/daily-log", label: "Daily farm log", icon: Activity, permission: "Farm Operations", section: "Daily operations" },
    { href: "/activity", label: "Activity archive", icon: History, permission: "Farm Operations", section: "Daily operations" },

    { href: "/equipment", label: "Equipment", icon: Package, permission: "Farm Operations", section: "Assets & finance" },
    { href: "/maintenance", label: "Maintenance", icon: Wrench, permission: "Farm Operations", section: "Assets & finance" },
    { href: "/expenses", label: "Farm expenses", icon: ReceiptText, permission: "Farm Operations", section: "Assets & finance" },

    { href: "/reports", label: "Report center", icon: BarChart3, permission: "Reports", section: "Monitoring" },
    { href: "/audit", label: "Audit trail", icon: History, adminOnly: true, section: "Monitoring" },
    { href: "/documents", label: "Farm documents", icon: FileText, permission: "Documents", section: "Monitoring" },
    { href: "/staff", label: "Staff & permissions", icon: UsersRound, adminOnly: true, section: "Monitoring" },

    { href: "/orders", label: "Orders", icon: ShoppingBag, permission: "Orders", section: "Store & customers" },
    { href: "/products", label: "Products", icon: Package, permission: "Products", section: "Store & customers" },
    { href: "/customers", label: "Customers", icon: UsersRound, permission: "Customers", section: "Store & customers" },
    { href: "/documents/quotations", label: "Quotations", icon: FileStack, permission: "Documents", section: "Store & customers" },
    { href: "/documents/invoices", label: "Invoices", icon: FileText, permission: "Documents", section: "Store & customers" },
    { href: "/documents/receipts", label: "Receipts", icon: ReceiptText, permission: "Documents", section: "Store & customers" },

    { href: "/media", label: "Farm media", icon: Images, permission: "Media", section: "Content & system" },
    { href: "/videos/manage", label: "Videos", icon: Video, permission: "Videos", section: "Content & system" },
    { href: "/settings", label: "Settings", icon: Settings, adminOnly: true, section: "Content & system" },
    { href: "/guide", label: "Guide & user manual", icon: BookOpen, adminOnly: true, section: "Content & system" },
  ];

  const nav: DashboardNavItem[] = allNav
    .filter((item) => (item.adminOnly ? isAdmin : !item.permission || can(item.permission)))
    .map(({ href, label, icon, badge, section }) => ({ href, label, icon, badge, section }));

  const activePermission = allNav
    .filter((item) => item.permission)
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.permission;

  return (
    <ProtectedRoute roles={["staff", "admin"]} permission={activePermission}>
      <DashboardShell
        title="The Branch Farm"
        subtitle={isAdmin
          ? "Remote farm oversight — monitor operations, review staff records, investigate issues and export reports."
          : "Farm operations — record daily work, livestock care, production, stock, expenses and problems."}
        nav={nav}
        roleLabel={isAdmin ? "Administrator" : "Farm Staff"}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
