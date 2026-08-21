"use client";

import { Activity, Bell, Boxes, Egg, FilePlus2, LayoutDashboard, Milk, PackageCheck, PawPrint, Sprout, Stethoscope, UserRound, Wheat, Wrench } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const nav = [
  { href: "/staff", label: "Farm overview", icon: LayoutDashboard },
  { href: "/staff/orders", label: "Orders", icon: PackageCheck },
  { href: "/staff/create-quotation", label: "Quotations", icon: FilePlus2 },
  { href: "/staff/animals", label: "Animals", icon: PawPrint },
  { href: "/staff/health", label: "Animal health", icon: Stethoscope },
  { href: "/staff/crops", label: "Crops & seeds", icon: Sprout },
  { href: "/staff/feed", label: "Feed", icon: Wheat },
  { href: "/staff/equipment", label: "Equipment", icon: Wrench },
  { href: "/staff/milk", label: "Milk", icon: Milk },
  { href: "/staff/eggs", label: "Eggs", icon: Egg },
  { href: "/staff/inventory", label: "Inventory", icon: Boxes },
  { href: "/staff/activities", label: "Activities", icon: Activity },
  { href: "/staff/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute roles={["staff", "admin"]}><DashboardShell title="Farm operations" subtitle="Record work where it happens and keep the farm connected." nav={nav} roleLabel="Staff workspace">{children}</DashboardShell></ProtectedRoute>;
}
