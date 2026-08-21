"use client";

import Link from "next/link";
import { ArrowRight, Box, CircleAlert, MapPin, PackageSearch, Phone, ReceiptText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { trackOrder } from "@/lib/firebase/data";
import { formatDate, friendlyError, money } from "@/lib/utils";
import type { Order } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

export default function TrackOrderPage() {
  const { user } = useAuth();
  const [orderNumber, setOrderNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const linkedOrder = new URLSearchParams(window.location.search).get("order");
      if (linkedOrder) setOrderNumber(linkedOrder.toUpperCase());
    } catch {}
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^ORD-\d{4}-\d{6}$/i.test(orderNumber.trim())) { setError("Enter an order number like ORD-2026-000001."); return; }
    if (!user && !/^\d{4}$/.test(phoneLast4)) { setError("Enter the last 4 digits of the order phone number for verification."); return; }
    if (phoneLast4 && !/^\d{4}$/.test(phoneLast4)) { setError("Enter the last 4 digits of the order phone number."); return; }
    setLoading(true); setError(""); setOrder(null); setSearched(false);
    try { const found = await trackOrder(orderNumber, phoneLast4 || undefined); setOrder(found); setSearched(true); }
    catch (cause) { setError(friendlyError(cause)); }
    finally { setLoading(false); }
  };

  return (
    <>
      <section className="page-hero track-hero"><div className="container page-hero-inner"><span className="eyebrow eyebrow-light"><PackageSearch size={15} /> Order updates</span><h1>Know exactly where your order stands.</h1><p>Enter the order number from your confirmation. Add the last four phone digits when requested for verification.</p></div></section>
      <section className="section track-section"><div className="container track-layout">
        <form className="track-form" onSubmit={submit}><div className="track-form-icon"><Search size={24} /></div><h2>Track my order</h2><p>Order numbers are not case-sensitive.</p><label className="field"><span>Order number</span><input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder="ORD-2026-000001" autoCapitalize="characters" /></label><label className="field"><span>Last 4 phone digits <em>{user ? "optional for your own order" : "required"}</em></span><input value={phoneLast4} onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder="e.g. 7668" /></label>{error && <div className="form-alert error"><CircleAlert size={17} /> {error}</div>}<button className="button button-primary button-large button-full" disabled={loading}>{loading ? <><i className="button-spinner" /> Checking…</> : <>Track order <ArrowRight size={18} /></>}</button><small className="track-privacy">Only customer-safe order details are shown. Administrative notes stay private.</small></form>
        <div className="track-result">
          {!searched && !order && <div className="track-placeholder"><span><Box size={34} /></span><h2>Your journey appears here</h2><p>Order received → confirmed → preparing → delivery → delivered.</p><div className="placeholder-line"><i /><i /><i /><i /><i /></div></div>}
          {searched && !order && <div className="track-not-found"><span><PackageSearch size={31} /></span><h2>We couldn&apos;t find that order</h2><p>Check the order number and verification digits, then try again. You can also call the farm for help.</p><Link className="button button-secondary" href="/contact"><Phone size={17} /> Contact the farm</Link></div>}
          {order && <div className="order-tracking-card"><div className="order-track-head"><div><small>Order</small><h2>{order.orderNumber}</h2><p>Placed {formatDate(order.createdAt, true)}</p></div><StatusBadge status={order.status} /></div><OrderTimeline status={order.status} /><div className="track-order-details"><div><span><ReceiptText size={18} /> Items</span><ul>{order.items.map((item) => <li key={item.productId}><span>{item.quantity} × {item.productName}</span><strong>{money(item.subtotal)}</strong></li>)}</ul></div><div><span><MapPin size={18} /> Delivery</span><p>{order.delivery.location}</p><small>{order.delivery.label}</small></div></div><div className="track-total"><span>Order total</span><strong>{money(order.total)}</strong></div></div>}
        </div>
      </div></section>
    </>
  );
}
