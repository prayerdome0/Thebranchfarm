"use client";

import Link from "next/link";
import {
  Activity as ActivityIcon,
  FileText,
  HeartPulse,
  PawPrint,
  Plus,
  ShoppingBag,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import {
  getAllProducts,
  getActivities,
  getAnimals,
  getFarmDocuments,
  getHealthRecords,
  getOrders,
  getUsers,
} from "@/lib/firebase/data";
import { formatDisplayDate } from "@/lib/utils";
import type {
  ActivityRecord,
  Animal,
  FarmDocument,
  HealthRecord,
  Order,
  Product,
  UserProfile,
} from "@/types";

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { formatMoney } = useStoreConfig();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [health, setHealth] = useState<HealthRecord[]>([]);
  const [documents, setDocuments] = useState<FarmDocument[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getAnimals().then(setAnimals);
    getHealthRecords().then(setHealth);
    getFarmDocuments().then(setDocuments);
    getActivities().then(setActivities);
    getOrders().then(setOrders);
    getAllProducts().then(setProducts);
    if (isAdmin) getUsers().then(setStaff);
  }, [isAdmin]);

  const activeCount = animals.filter((animal) => animal.status === "active").length;
  const attentionCount = animals.filter(
    (animal) => ["sick", "injured", "under-observation"].includes(animal.healthStatus),
  ).length;
  const staffCount = staff.filter(
    (member) => (member.role === "staff" || member.role === "admin") && member.status === "active",
  ).length;

  const openOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const revenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);
  const lowStock = products.filter(
    (product) => product.trackInventory && product.stock <= 5 && product.active,
  );

  const stats = [
    { label: "Animals", value: animals.length, icon: PawPrint, href: "/animals" },
    { label: "Active animals", value: activeCount, icon: PawPrint, href: "/animals" },
    { label: "Need attention", value: attentionCount, icon: HeartPulse, href: "/health", warning: attentionCount > 0 },
    { label: "Health records", value: health.length, icon: Stethoscope, href: "/health" },
    { label: "Documents", value: documents.length, icon: FileText, href: "/documents" },
    { label: "Open orders", value: openOrders.length, icon: ShoppingBag, href: "/orders", warning: pendingOrders.length > 0 },
    { label: "Revenue", value: formatMoney(revenue), icon: ShoppingBag, href: "/orders" },
    ...(isAdmin ? [{ label: "Staff", value: staffCount, icon: UsersRound, href: "/staff" }] : []),
  ];

  return (
    <div className="dashboard-stack">
      <section className="dashboard-welcome">
        <div>
          <span>Farm dashboard</span>
          <h2>Good day, {user?.fullName?.split(" ")[0] || "team"}.</h2>
          <p>Here is a live view of the farm — animals, health, staff, documents and activity.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isAdmin && (
            <Link className="button button-light" href="/animals/new">
              <Plus size={18} /> Add animal
            </Link>
          )}
          <Link className="button button-glass" href="/health">
            <Stethoscope size={18} /> Animal health
          </Link>
        </div>
      </section>

      <section className="stat-grid farm-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article key={stat.label} className={stat.warning ? "warning" : ""}>
              <span>
                <Icon size={21} />
              </span>
              <div>
                <small>{stat.label}</small>
                <strong>{stat.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-two-columns">
        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Recent health records</h2>
              <p>Problems, observations and treatments from the team.</p>
            </div>
            <Link className="text-link" href="/health">
              View all
            </Link>
          </div>
          {health.length ? (
            <div className="activity-feed" style={{ marginTop: 14 }}>
              {health.slice(0, 5).map((record) => (
                <article key={record.id}>
                  <span>
                    <Stethoscope size={16} />
                  </span>
                  <div>
                    <strong>{record.problem}</strong>
                    <p>{record.animalLabel || record.animalId}</p>
                    <small>
                      {formatDisplayDate(record.date)} · {record.createdByName || "Team member"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>
              No health records yet. Open an animal to add the first one.
            </p>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Recent activity</h2>
              <p>Daily work recorded around the farm.</p>
            </div>
            <Link className="text-link" href="/activity">
              View all
            </Link>
          </div>
          {activities.length ? (
            <div className="activity-feed" style={{ marginTop: 14 }}>
              {activities.slice(0, 5).map((record) => (
                <article key={record.id}>
                  <span>
                    <ActivityIcon size={16} />
                  </span>
                  <div>
                    <strong>{record.activity}</strong>
                    <p>{record.notes}</p>
                    <small>
                      {formatDisplayDate(record.date)} · {record.createdByName || "Team member"}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>
              No activity recorded yet. Log feeding, cleaning, inspections and more.
            </p>
          )}
        </div>
      </section>

      <section className="dashboard-two-columns">
        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Recent orders</h2>
              <p>Latest orders from the online shop.</p>
            </div>
            <Link className="text-link" href="/orders">
              View all
            </Link>
          </div>
          {orders.length ? (
            <div className="staff-order-list">
              {orders.slice(0, 5).map((order) => (
                <Link href={`/orders/${order.id}`} key={order.id}>
                  <span>
                    <ShoppingBag size={16} />
                  </span>
                  <div>
                    <strong>{order.reference}</strong>
                    <small>{order.customer.name}</small>
                  </div>
                  <strong style={{ fontSize: ".72rem" }}>{formatMoney(order.total)}</strong>
                  <small style={{ color: "var(--muted)" }}>{order.status}</small>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>No orders yet.</p>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="section-row">
            <div>
              <h2>Low stock</h2>
              <p>Products with five or fewer units left.</p>
            </div>
            <Link className="text-link" href="/products">
              Manage
            </Link>
          </div>
          {lowStock.length ? (
            <div className="staff-order-list">
              {lowStock.slice(0, 6).map((product) => (
                <Link href={`/products/${product.id}/edit`} key={product.id}>
                  <span>
                    <ShoppingBag size={16} />
                  </span>
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.kind}</small>
                  </div>
                  <strong style={{ fontSize: ".72rem", color: "var(--warning)" }}>
                    {product.stock} left
                  </strong>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ marginTop: 14, fontSize: ".75rem" }}>All products are well stocked.</p>
          )}
        </div>
      </section>
    </div>
  );
}
