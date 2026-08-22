"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, UsersRound, Phone, Mail, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { watchCustomers } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { Customer } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stop = watchCustomers((list) => {
      setCustomers(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (!term) return true;
      return [c.name, c.phone, c.email, c.deliveryLocation].filter(Boolean).some((v) => String(v).toLowerCase().includes(term));
    });
  }, [customers, search]);

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Customers</h2>
          <p>Every customer who places an order gets a record. Name, phone, email, orders, total spent, last order, delivery location, status, date registered.</p>
        </div>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers by name, phone, email, location…" aria-label="Search customers" />
        </div>
      </div>

      {loading ? <Loading label="Loading customers…" /> : visible.length ? (
        <div className="dashboard-panel people-panel">
          <div className="people-table" style={{ minWidth: 800 }}>
            <div className="table-head" style={{ gridTemplateColumns: "1.4fr .9fr .7fr .5fr .7fr .6fr" }}>
              <span>Customer</span><span>Phone</span><span>Location</span><span>Orders</span><span>Total Spent</span><span>Last Order</span>
            </div>
            {visible.map((c) => (
              <article key={c.id} style={{ gridTemplateColumns: "1.4fr .9fr .7fr .5fr .7fr .6fr" }}>
                <Link href={`/customers/${c.id}`} className="person-cell customer-cell-link">
                  <i>{c.name.slice(0,2).toUpperCase()}</i>
                  <span><strong>{c.name}</strong><small>{c.email || "No email"} · History</small></span>
                </Link>
                <span>{c.phone}</span>
                <span>{c.deliveryLocation || "—"}</span>
                <span>{c.orders || 0}</span>
                <span>{money(c.totalSpent || 0)}</span>
                <span>{formatDate(c.lastOrder || c.createdAt, true)}</span>
              </article>
            ))}
          </div>
        </div>
      ) : customers.length ? (
        <EmptyState icon={Search} title="No matching customers" description="Try a different search." />
      ) : (
        <EmptyState icon={UsersRound} title="No customers yet" description="When customers place orders, they will appear here with name, phone, email, orders, total spent, last order, delivery location, status and date registered." />
      )}
    </div>
  );
}
