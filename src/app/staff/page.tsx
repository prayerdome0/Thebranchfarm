"use client";

import Link from "next/link";
import { Activity, ArrowRight, Boxes, CircleAlert, Clock3, Egg, Milk, PackageCheck, PawPrint, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCollection, getOperationalOrders } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { Order } from "@/types";

type RecordItem = Record<string, unknown> & { id: string; createdAt?: never; archived?: boolean };

export default function StaffDashboardPage() {
  const [data, setData] = useState<{ orders: Order[]; animals: RecordItem[]; milk: RecordItem[]; eggs: RecordItem[]; inventory: RecordItem[]; activities: RecordItem[] } | null>(null);
  useEffect(() => { Promise.all([getOperationalOrders(), getCollection<RecordItem>("animals"), getCollection<RecordItem>("milkProduction"), getCollection<RecordItem>("eggProduction"), getCollection<RecordItem>("inventory"), getCollection<RecordItem>("farmActivities")]).then(([orders, animals, milk, eggs, inventory, activities]) => setData({ orders, animals: animals.filter((x) => !x.archived), milk, eggs, inventory: inventory.filter((x) => !x.archived), activities })).catch(() => setData({ orders: [], animals: [], milk: [], eggs: [], inventory: [], activities: [] })); }, []);
  const pending = data?.orders.filter((order) => ["pending", "confirmed", "preparing"].includes(order.status)) || [];
  const low = data?.inventory.filter((item) => Number(item.quantity) <= Number(item.lowStockThreshold)) || [];
  const today = new Date().toISOString().slice(0, 10);
  const milkToday = data?.milk.filter((item) => item.date === today).reduce((sum, item) => sum + Number(item.totalProduction || 0), 0) || 0;
  const eggsToday = data?.eggs.filter((item) => item.date === today).reduce((sum, item) => sum + Number(item.eggsCollected || 0), 0) || 0;
  return <div className="dashboard-stack"><section className="dashboard-welcome staff-welcome"><div><span>Today on the farm</span><h2>Operations at a glance</h2><p>Every number below comes from recorded Firebase data.</p></div><Link href="/staff/activities" className="button button-primary"><Plus size={18} /> Record activity</Link></section>
    <section className="stat-grid operations-stats"><article><span><PawPrint size={20} /></span><div><small>Active animals</small><strong>{data ? data.animals.length : "—"}</strong></div></article><article><span><Milk size={20} /></span><div><small>Milk today</small><strong>{data ? `${milkToday}L` : "—"}</strong></div></article><article><span><Egg size={20} /></span><div><small>Eggs today</small><strong>{data ? eggsToday : "—"}</strong></div></article><article><span><PackageCheck size={20} /></span><div><small>Orders to action</small><strong>{data ? pending.length : "—"}</strong></div></article><article className={low.length ? "warning" : ""}><span><Boxes size={20} /></span><div><small>Low stock alerts</small><strong>{data ? low.length : "—"}</strong></div></article></section>
    {low.length > 0 && <section className="operational-alert"><TriangleAlert size={20} /><div><strong>Low inventory needs attention</strong><p>{low.slice(0, 3).map((item) => String(item.product)).join(", ")}{low.length > 3 ? ` and ${low.length - 3} more` : ""}</p></div><Link href="/staff/inventory">View stock</Link></section>}
    <div className="dashboard-two-columns staff-columns"><section className="dashboard-panel"><div className="panel-head"><div><h2>Orders to action</h2><p>Newest operational requests.</p></div><Link href="/staff/orders">All orders <ArrowRight size={16} /></Link></div>{pending.length ? <div className="staff-order-list">{pending.slice(0, 5).map((order) => <Link href="/staff/orders" key={order.id}><span><PackageCheck size={18} /></span><div><strong>{order.orderNumber}</strong><small>{order.customer.fullName} · {order.delivery.location}</small></div><strong>{money(order.total)}</strong><StatusBadge status={order.status} /></Link>)}</div> : <div className="panel-empty-copy"><PackageCheck size={21} /> No orders currently need action.</div>}</section>
    <section className="dashboard-panel"><div className="panel-head"><div><h2>Recent activities</h2><p>Latest staff records.</p></div><Link href="/staff/activities">Record activity</Link></div>{data?.activities.length ? <div className="activity-feed">{data.activities.slice(0, 6).map((item) => <article key={item.id}><span><Activity size={17} /></span><div><strong>{String(item.activity)}</strong><p>{String(item.notes || "No notes")}</p><small><Clock3 size={12} /> {item.createdAt ? formatDate(item.createdAt, true) : String(item.date || "")}</small></div></article>)}</div> : <div className="panel-empty-copy"><Activity size={21} /> No activities recorded yet.</div>}</section></div>
  </div>;
}
