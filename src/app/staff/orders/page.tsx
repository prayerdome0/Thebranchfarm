"use client";

import { CircleAlert, Mail, MessageCircle, PackageCheck, Phone, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getOperationalOrders, updateOrderStatus } from "@/lib/firebase/data";
import { ORDER_STATUSES, ORDER_TRANSITIONS, STATUS_LABELS } from "@/lib/constants";
import { formatDate, friendlyError, money, phoneHref, whatsappHref } from "@/lib/utils";
import { useToast } from "@/contexts/ToastContext";
import type { Order, OrderStatus } from "@/types";

export default function StaffOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [updating, setUpdating] = useState("");
  const load = () => { setLoading(true); getOperationalOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false)); };
  useEffect(load, []);
  const visible = useMemo(() => orders.filter((order) => { const matches = !search || `${order.orderNumber} ${order.customer.fullName} ${order.customer.phone} ${order.delivery.location}`.toLowerCase().includes(search.toLowerCase()); const statusMatch = status === "all" || (status === "active" ? !["completed", "cancelled"].includes(order.status) : order.status === status); return matches && statusMatch; }), [orders, search, status]);
  const changeStatus = async (order: Order, next: OrderStatus) => { setUpdating(order.id); try { await updateOrderStatus(order.id, next); setOrders((current) => current.map((entry) => entry.id === order.id ? { ...entry, status: next } : entry)); showToast(`Order moved to ${STATUS_LABELS[next]}.`, "success"); } catch (cause) { showToast(friendlyError(cause), "error"); } finally { setUpdating(""); } };
  const whatsappMessage = (order: Order) => `Hello ${order.customer.fullName}, this is The Branch Farm regarding order ${order.orderNumber}. Current status: ${STATUS_LABELS[order.status]}.`;
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>Order operations</h2><p>Confirm, prepare and communicate with customers.</p></div><button className="button button-secondary" onClick={load}><RefreshCw size={17} /> Refresh</button></section><div className="operations-toolbar"><label className="search-field"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer or location" /></label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active orders</option><option value="all">All statuses</option>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></div>
    {loading ? <section className="dashboard-panel"><div className="loading-state"><i className="loader" /> Loading operational orders…</div></section> : visible.length ? <div className="operational-order-grid">{visible.map((order) => <article key={order.id} className="operational-order-card"><header><div><small>{formatDate(order.createdAt, true)}</small><h3>{order.orderNumber}</h3></div><StatusBadge status={order.status} /></header><div className="operational-customer"><strong>{order.customer.fullName}</strong><span>{order.customer.phone}</span><small>{order.delivery.location} · {order.delivery.label}</small></div><ul>{order.items.map((item) => <li key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{money(item.subtotal)}</strong></li>)}</ul><div className="operational-total"><span>Total</span><strong>{money(order.total)}</strong></div><div className="contact-action-row"><a href={phoneHref(order.customer.phone)} title="Call customer"><Phone size={17} /> Call</a>{order.customer.whatsappAvailable && <a href={whatsappHref(order.customer.phone, whatsappMessage(order))} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>}{order.customer.email && <a href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`The Branch Farm · ${order.orderNumber}`)}`}><Mail size={17} /> Email</a>}</div><label className="status-select"><span>Update status</span><select value={order.status} onChange={(e) => changeStatus(order, e.target.value as OrderStatus)} disabled={updating === order.id}>{ORDER_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select>{updating === order.id && <i className="mini-loader" />}</label></article>)}</div> : <section className="dashboard-panel"><div className="empty-state compact"><span className="empty-icon"><PackageCheck size={25} /></span><h3>No matching orders</h3><p>Adjust the search or status filter.</p></div></section>}
    <div className="orders-security-note"><CircleAlert size={17} /> Status changes are validated by the secure Firebase function and written to the audit trail.</div></div>;
}
