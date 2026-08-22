"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FULFILLMENT_LABELS, PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_SPEC } from "@/lib/constants";
import { watchOrders } from "@/lib/firebase/data";
import { cn, formatDate, money } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Preparing" },
  { value: "ready", label: "Out for Delivery" },
  { value: "completed", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stop = watchOrders((list) => {
      setOrders(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesFilter = filter === "all" || order.status === filter;
      const matchesSearch =
        !term ||
        [order.reference, order.customer.name, order.customer.phone, order.customer.email, order.deliveryAddress, (order as any).deliveryLocation]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Orders</h2>
          <p>Order Number, Customer, Phone, Products, Quantity, Total, Delivery Location, Payment Status, Order Status, Date. Search, filter, view, update status, customer details, delivery details, order notes, history, receipt, invoice, quotation.</p>
        </div>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number, customer, phone, delivery location…" aria-label="Search orders" />
        </div>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filter by status">
        {FILTERS.map((option) => (
          <button key={option.value} type="button" className={cn(filter === option.value && "active")} onClick={() => setFilter(option.value)}>
            {option.label}
          </button>
        ))}
      </div>

      {loading ? <Loading label="Loading orders…" /> : visible.length ? (
        <div className="operational-order-grid">
          {visible.map((order) => (
            <article className="operational-order-card" key={order.id}>
              <header>
                <div><small>Order Number</small><h3>{order.reference}</h3></div>
                <StatusBadge status={order.status} />
              </header>

              <div className="operational-customer">
                <strong>{order.customer.name}</strong>
                <span>{order.customer.phone} {order.customer.email ? `· ${order.customer.email}` : ""}</span>
                <small>Delivery: {order.deliveryAddress || (order as any).deliveryLocation || FULFILLMENT_LABELS[order.fulfillment]} · {formatDate(order.createdAt, true)}</small>
                <small>Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus} · {order.paymentMethod || "—"}</small>
              </div>

              <ul>
                {order.items.map((item) => (
                  <li key={item.productId}><span>{item.name} × {item.quantity} ({item.unit})</span><span>{money(item.price * item.quantity)}</span></li>
                ))}
              </ul>

              <div className="operational-total">
                <span>{order.items.reduce((s, i) => s + i.quantity, 0)} items · {order.status}</span>
                <strong>{money(order.total)}</strong>
              </div>

              {order.notes && <p style={{ marginTop: 10, fontSize: ".7rem", color: "var(--muted)" }}>Notes: {order.notes}</p>}

              <Link href={`/orders/${order.id}`} style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 36, color: "var(--green-700)", background: "var(--green-50)", borderRadius: 7, fontSize: ".7rem", fontWeight: 750 }}>
                View & update · Receipt · Invoice <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      ) : orders.length ? (
        <EmptyState icon={Search} title="No matching orders" description="Try different search or status filter." />
      ) : (
        <EmptyState icon={ShoppingBag} title="No orders yet" description="Customer orders will appear here with order number, customer, phone, products, quantity, total, delivery location, payment status, order status, date." action={<Link className="button button-primary" href="/shop">View shop</Link>} />
      )}
    </div>
  );
}
