"use client";

import { useState } from "react";
import { CircleAlert, PackageSearch, Search, Truck, MapPin } from "lucide-react";
import { FULFILLMENT_LABELS, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, BUSINESS } from "@/lib/constants";
import { getOrderByReference } from "@/lib/firebase/data";
import { formatDate, money } from "@/lib/utils";
import type { Order } from "@/types";

export default function TrackPage() {
  const [reference, setReference] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!value) return;
    setLoading(true);
    setNotFound(false);
    const found = await getOrderByReference(value);
    setOrder(found);
    setNotFound(!found);
    setLoading(false);
  };

  return (
    <>
      <section className="page-hero track-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">{BUSINESS.name} · {BUSINESS.slogan} — My Orders</span>
          <h1>Order tracking</h1>
          <p>Enter order number to see status: New, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled. Delivery location shown. {BUSINESS.deliveryFree}</p>
        </div>
      </section>

      <section className="section" style={{ background: "#f7f9f6" }}>
        <div className="container">
          <div className="track-layout">
            <form className="track-form" onSubmit={submit}>
              <span className="track-form-icon"><PackageSearch size={24} /></span>
              <h2>Find order</h2>
              <p>Reference like <strong>TB-7K2M9Q</strong>. Customer record created on order.</p>
              <label className="field"><span>Order Number</span><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TB-XXXXXX" autoFocus /></label>
              <button className="button button-primary button-full" disabled={loading}>{loading ? <><i className="button-spinner" /> Tracking…</> : <><Search size={17} /> Track</>}</button>
              <p className="track-privacy">My Orders, Order Details, Order Tracking, Profile — no account required, just reference.</p>
            </form>

            <div className="track-result">
              {!order && !notFound && (
                <div className="track-placeholder">
                  <span><Truck size={30} /></span>
                  <h2>Track any order</h2>
                  <p>Enter reference from confirmation to see progress, delivery location, payment status, notes.</p>
                </div>
              )}
              {notFound && <div className="track-not-found"><span><CircleAlert size={30} /></span><h2>Order not found</h2><p>Check reference — on your receipt/invoice.</p></div>}
              {order && <OrderTimeline order={order} />}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);
  const cancelled = order.status === "cancelled";
  return (
    <div className="order-tracking-card">
      <div className="order-track-head">
        <div><small>Order Number</small><h2>{order.reference}</h2><p>Placed {formatDate(order.createdAt, true)} · {order.customer.name} · {order.customer.phone}</p><p style={{ marginTop: 4 }}><MapPin size={12} /> Delivery Location: {order.deliveryAddress || (order as any).deliveryLocation || FULFILLMENT_LABELS[order.fulfillment]}</p></div>
        <span className={`status-badge status-${order.status}`}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>
      {cancelled && <div className="cancelled-order">Cancelled. Contact farm.</div>}
      {!cancelled && (
        <ol className="order-timeline">
          {ORDER_STATUS_FLOW.map((step, index) => (
            <li key={step} className={index <= currentIndex ? "complete" : ""}><span>{index + 1}</span><strong>{ORDER_STATUS_LABELS[step]}</strong>{index === currentIndex && <small>Current</small>}</li>
          ))}
        </ol>
      )}
      <div className="track-order-details">
        <div><span>Products · Quantity</span><ul>{order.items.map((item) => (<li key={item.productId}><span>{item.name} × {item.quantity} ({item.unit})</span><span>{money(item.price * item.quantity)}</span></li>))}</ul><p>{FULFILLMENT_LABELS[order.fulfillment]} — {order.deliveryAddress || "The Branch Farm"}</p></div>
        <div><span>Customer & Payment</span><ul><li><small>Customer</small><small>{order.customer.name}</small></li><li><small>Phone</small><small>{order.customer.phone}</small></li><li><small>Payment</small><small>{(PAYMENT_STATUS_LABELS as any)[order.paymentStatus] || order.paymentStatus}</small></li><li><small>Total</small><small>{money(order.total)}</small></li></ul>{order.notes && <p style={{ marginTop: 8, fontSize: ".75rem" }}>Notes: {order.notes}</p>}</div>
      </div>
      <div className="track-total"><span>Total · Subtotal + Delivery</span><strong>{money(order.total)}</strong></div>
    </div>
  );
}
