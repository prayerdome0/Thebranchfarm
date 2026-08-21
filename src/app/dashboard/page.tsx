"use client";

import Link from "next/link";
import { ArrowRight, Bell, Clock3, FileCheck2, MapPin, PackageCheck, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { getMyDocuments, getMyNotifications, getMyOrders } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { AppNotification, BusinessDocument, Order } from "@/types";

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([getMyOrders(user.uid), getMyDocuments(user.uid), getMyNotifications(user.uid)]).then(([orderResult, documentResult, notificationResult]) => {
      if (orderResult.status === "fulfilled") setOrders(orderResult.value);
      if (documentResult.status === "fulfilled") setDocuments(documentResult.value);
      if (notificationResult.status === "fulfilled") setNotifications(notificationResult.value);
      setLoading(false);
    });
  }, [user]);

  const active = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const unread = notifications.filter((item) => !item.read).length;
  return <div className="dashboard-stack"><section className="dashboard-welcome"><div><span>Welcome back,</span><h2>{user?.fullName?.split(" ")[0] || "Customer"}</h2><p>Here is the latest from your Branch Farm account.</p></div><Link href="/shop" className="button button-primary"><ShoppingBag size={18} /> Shop fresh products</Link></section>
    <section className="stat-grid customer-stats"><article><span><PackageCheck size={20} /></span><div><small>Active orders</small><strong>{loading ? "—" : active.length}</strong></div></article><article><span><FileCheck2 size={20} /></span><div><small>Documents</small><strong>{loading ? "—" : documents.length}</strong></div></article><article><span><Bell size={20} /></span><div><small>New updates</small><strong>{loading ? "—" : unread}</strong></div></article></section>
    <section className="dashboard-panel"><div className="panel-head"><div><h2>Recent orders</h2><p>Live statuses from the farm team.</p></div><Link href="/dashboard/orders">View all <ArrowRight size={16} /></Link></div>{orders.length ? <div className="customer-order-list">{orders.slice(0, 4).map((order) => <Link href={`/dashboard/orders#${order.orderNumber}`} key={order.id}><span className="order-list-icon"><PackageCheck size={20} /></span><div><strong>{order.orderNumber}</strong><small><Clock3 size={13} /> {formatDate(order.createdAt)}</small></div><div className="order-list-location"><MapPin size={14} /> {order.delivery.location}</div><strong>{money(order.total)}</strong><StatusBadge status={order.status} /><ArrowRight size={17} /></Link>)}</div> : <EmptyState icon={PackageCheck} title={loading ? "Loading orders…" : "No orders yet"} description={loading ? "Checking your secure order history." : "When you place an order, its progress will appear here."} action={!loading && <Link href="/shop" className="button button-secondary">Browse the shop</Link>} />}</section>
    <div className="dashboard-two-columns"><section className="dashboard-panel"><div className="panel-head"><div><h2>Notifications</h2><p>Updates meant for you.</p></div><Link href="/dashboard/notifications">See all</Link></div>{notifications.length ? <div className="mini-feed">{notifications.slice(0, 4).map((item) => <article key={item.id} className={!item.read ? "unread" : ""}><i /><div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.createdAt, true)}</small></div></article>)}</div> : <p className="panel-empty-copy">No customer notifications yet.</p>}</section><section className="dashboard-panel dashboard-help"><span><MapPin size={23} /></span><h2>Delivery made simple</h2><p>Free around Manzini and Matsapha. For another location, the team will arrange it with you — no invented online charge.</p><Link href="/contact" className="text-link">Ask about delivery <ArrowRight size={16} /></Link></section></div>
  </div>;
}
