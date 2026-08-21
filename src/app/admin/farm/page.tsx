"use client";

import Link from "next/link";
import { Activity, ArrowRight, Boxes, Egg, Milk, PawPrint, Sprout, Stethoscope, Wheat, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { getCollection } from "@/lib/firebase/data";

type Row = Record<string, unknown> & { id: string; archived?: boolean };
const modules = [
  { href: "/admin/farm/animals", icon: PawPrint, title: "Livestock", copy: "Cattle, pigs, chickens, health and status records.", collection: "animals" },
  { href: "/admin/farm/health", icon: Stethoscope, title: "Animal health", copy: "Vaccinations, treatments, medication and veterinary visits.", collection: "animalHealth" },
  { href: "/admin/farm/crops", icon: Sprout, title: "Crops & seeds", copy: "Seed stock, planting, harvest and plot records.", collection: "crops" },
  { href: "/admin/farm/feed", icon: Wheat, title: "Feed", copy: "Feed stock, suppliers, usage and reorder alerts.", collection: "feed" },
  { href: "/admin/farm/equipment", icon: Wrench, title: "Equipment", copy: "Tractors, pumps, tools and machinery with maintenance.", collection: "equipment" },
  { href: "/admin/farm/milk", icon: Milk, title: "Milk production", copy: "Daily litres, sales, remaining and waste.", collection: "milkProduction" },
  { href: "/admin/farm/eggs", icon: Egg, title: "Egg production", copy: "Collected, sold, damaged and remaining stock.", collection: "eggProduction" },
  { href: "/admin/farm/inventory", icon: Boxes, title: "Inventory", copy: "Feed, supplies, packaging and product balances.", collection: "inventory" },
  { href: "/admin/farm/activities", icon: Activity, title: "Activities", copy: "Traceable work recorded by the farm team.", collection: "farmActivities" },
];
export default function AdminFarmPage() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => { Promise.all(modules.map((item) => getCollection<Row>(item.collection).then((rows) => [item.collection, rows.filter((row) => !row.archived).length] as const).catch(() => [item.collection, 0] as const))).then((entries) => setCounts(Object.fromEntries(entries))); }, []);
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Farm management</h2><p>Everything staff records becomes visible here with creator and update traceability.</p></div></section><div className="farm-module-grid">{modules.map((module) => { const Icon = module.icon; return <Link href={module.href} key={module.href}><span><Icon size={23} /></span><small>{counts[module.collection] ?? "—"} active records</small><h3>{module.title}</h3><p>{module.copy}</p><strong>Open module <ArrowRight size={16} /></strong></Link>; })}</div><section className="dashboard-panel farm-traceability"><PawPrint size={24} /><div><h2>Accountable by design</h2><p>Important farm records include who created and updated them, when it happened, and whether the record was archived. Operational history is preserved instead of silently deleted.</p></div></section></div>;
}
