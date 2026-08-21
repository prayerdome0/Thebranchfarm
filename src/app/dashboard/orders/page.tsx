"use client";

import Link from "next/link";
import { MapPin, PackageSearch, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { getMyOrders } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { Order } from "@/types";

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (user) getMyOrders(user.uid).then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false)); }, [user]);
  return <div className="dashboard-stack"><section className="dashboard-section-title"><div><h2>My orders</h2><p>Every recorded order and its current farm status.</p></div><Link href="/shop" className="button button-primary">Place a new order</Link></section>{loading ? <div className="dashboard-panel"><Loading label="Loading your orders…" /></div> : !orders.length ? <div className="dashboard-panel"><EmptyState icon={PackageSearch} title="No orders yet" description="Your first farm order will appear here." action={<Link href="/shop" className="button button-primary">Shop products</Link>} /></div> : <div className="account-order-grid">{orders.map((order) => <article className="account-order-card" id={order.orderNumber} key={order.id}><header><div><small>Placed {formatDate(order.createdAt)}</small><h3>{order.orderNumber}</h3></div><StatusBadge status={order.status} /></header><OrderTimeline status={order.status} /><div className="account-order-items">{order.items.map((item) => <p key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{money(item.subtotal)}</strong></p>)}</div><footer><span><MapPin size={15} /> {order.delivery.location} · {order.delivery.label}</span><strong>{money(order.total)}</strong></footer></article>)}</div>}<div className="dashboard-support-bar"><Phone size={19} /><p><strong>Need help with an order?</strong><span>Contact the farm and quote your order number.</span></p><Link href="/contact">Contact us</Link></div></div>;
}
