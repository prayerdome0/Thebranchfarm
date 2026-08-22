"use client";

import Link from "next/link";
import { FileText, Package, PawPrint, ShoppingBag, UsersRound, Upload, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getAllProducts, getAnimals, getOrders, getCustomers } from "@/lib/firebase/data";
import { formatDisplayDate } from "@/lib/utils";
import type { Animal, Order, Product, Customer } from "@/types";
import { BUSINESS } from "@/lib/constants";

export default function DashboardPage() {
  const { user } = useAuth();
  const { formatMoney } = useStoreConfig();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    getAnimals().then(setAnimals);
    getOrders().then(setOrders);
    getAllProducts().then(setProducts);
    getCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const today = new Date().toISOString().slice(0,10);
  const ordersToday = orders.filter((o) => {
    const d = typeof o.createdAt === "string" ? o.createdAt : (o.createdAt as any)?.toDate?.()?.toISOString?.() || new Date().toISOString();
    return d.slice(0,10) === today;
  });

  const lowStock = products.filter((p) => p.trackInventory && p.stock <= 5 && p.active);

  const stats = [
    { label: "Orders Today", value: ordersToday.length, icon: ShoppingBag, href: "/orders" },
    { label: "Products", value: products.length, icon: Package, href: "/products" },
    { label: "Animals", value: animals.length, icon: PawPrint, href: "/animals" },
    { label: "Customers", value: customers.length, icon: UsersRound, href: "/customers" },
    { label: "Low Stock", value: lowStock.length, icon: Package, href: "/products", warning: lowStock.length > 0 },
  ];

  return (
    <div className="dashboard-stack">
      <section className="dashboard-welcome" style={{ background: "var(--green-900)" }}>
        <div>
          <span>{BUSINESS.name} · {BUSINESS.slogan}</span>
          <h2>Good day, {user?.fullName?.split(" ")[0] || "admin"}.</h2>
          <p>Simple dashboard — orders today, products, animals, customers, low stock, recent orders, quick actions.</p>
        </div>
      </section>

      <section className="stat-grid farm-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link href={stat.href} key={stat.label} style={{ textDecoration: "none" }}>
              <article className={stat.warning ? "warning" : ""} style={{ cursor: "pointer" }}>
                <span><Icon size={21} /></span>
                <div><small>{stat.label}</small><strong>{stat.value}</strong></div>
              </article>
            </Link>
          );
        })}
      </section>

      <section className="dashboard-two-columns">
        <div className="dashboard-panel">
          <div className="section-row">
            <div><h2>Recent Orders</h2><p>Latest customer orders.</p></div>
            <Link className="text-link" href="/orders">View all</Link>
          </div>
          {orders.length ? (
            <div className="staff-order-list" style={{ marginTop: 14 }}>
              {orders.slice(0, 5).map((order) => (
                <Link href={`/orders/${order.id}`} key={order.id}>
                  <span><ShoppingBag size={16} /></span>
                  <div><strong>{order.reference}</strong><small>{order.customer.name} · {order.deliveryAddress || order.fulfillment}</small></div>
                  <strong style={{ fontSize: ".72rem" }}>{formatMoney(order.total)}</strong>
                  <small>{order.status}</small>
                </Link>
              ))}
            </div>
          ) : <p style={{ marginTop: 14, fontSize: ".75rem" }}>No orders yet.</p>}
        </div>

        <div className="dashboard-panel">
          <div className="section-row">
            <div><h2>Recent Activity</h2><p>Orders and stock alerts.</p></div>
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {ordersToday.length ? ordersToday.slice(0,3).map((o) => (
              <div key={o.id} style={{ padding: 12, background: "#f8faf7", borderRadius: 8, fontSize: ".75rem" }}>
                <strong>{o.reference}</strong> — {o.customer.name} — {formatMoney(o.total)} — {o.deliveryAddress || o.fulfillment}
              </div>
            )) : <p style={{ fontSize: ".75rem" }}>No orders today.</p>}
            {lowStock.length > 0 && (
              <div style={{ padding: 12, background: "#fff3d8", borderRadius: 8, fontSize: ".75rem" }}>
                <strong>Low stock:</strong> {lowStock.slice(0,3).map((p) => p.name).join(", ")} {lowStock.length > 3 ? `+${lowStock.length - 3} more` : ""}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: 16 }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          <Link className="button button-primary" href="/products/new"><Plus size={16} /> Add Product</Link>
          <Link className="button button-secondary" href="/animals/new"><Plus size={16} /> Add Animal</Link>
          <Link className="button button-secondary" href="/orders"><ShoppingBag size={16} /> New Order (Shop)</Link>
          <Link className="button button-secondary" href="/media"><Upload size={16} /> Upload Media</Link>
          <Link className="button button-secondary" href="/documents/quotations"><FileText size={16} /> Create Quotation</Link>
          <Link className="button button-secondary" href="/documents/invoices"><FileText size={16} /> Create Invoice</Link>
        </div>
      </section>
    </div>
  );
}
