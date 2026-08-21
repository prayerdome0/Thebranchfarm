"use client";

import { useState } from "react";
import { CircleAlert, PackageSearch, Search, Truck } from "lucide-react";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
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
          <span className="eyebrow eyebrow-light">Order tracking</span>
          <h1>Track your order.</h1>
          <p>Enter your order reference to see its progress and details.</p>
        </div>
      </section>

      <section className="section" style={{ background: "#f7f9f6" }}>
        <div className="container">
          <div className="track-layout">
            <form className="track-form" onSubmit={submit}>
              <span className="track-form-icon">
                <PackageSearch size={24} />
              </span>
              <h2>Find an order</h2>
              <p>Your reference looks like <strong>TB-7K2M9Q</strong>.</p>
              <label className="field">
                <span>Order reference</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="TB-XXXXXX"
                  autoFocus
                />
              </label>
              <button className="button button-primary button-full" disabled={loading}>
                {loading ? (
                  <>
                    <i className="button-spinner" /> Tracking…
                  </>
                ) : (
                  <>
                    <Search size={17} /> Track order
                  </>
                )}
              </button>
              <p className="track-privacy">Only the order reference is needed — no account required.</p>
            </form>

            <div className="track-result">
              {!order && !notFound && (
                <div className="track-placeholder">
                  <span>
                    <Truck size={30} />
                  </span>
                  <h2>Track any order</h2>
                  <p>Enter the reference from your confirmation to see where your order is.</p>
                  <div className="placeholder-line">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}

              {notFound && (
                <div className="track-not-found">
                  <span>
                    <CircleAlert size={30} />
                  </span>
                  <h2>Order not found</h2>
                  <p>Double-check the reference and try again — it&apos;s on your confirmation.</p>
                </div>
              )}

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
        <div>
          <small>Order reference</small>
          <h2>{order.reference}</h2>
          <p>Placed {formatDate(order.createdAt, true)}</p>
        </div>
        <span className={`status-badge status-${order.status}`}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      {cancelled && (
        <div className="cancelled-order">This order has been cancelled. Contact the farm for details.</div>
      )}

      {!cancelled && (
        <ol className="order-timeline">
          {ORDER_STATUS_FLOW.map((step, index) => (
            <li
              key={step}
              className={index <= currentIndex ? "complete" : index === currentIndex + 1 ? "current" : ""}
            >
              <span>{index + 1}</span>
              <strong>{ORDER_STATUS_LABELS[step]}</strong>
              {index === currentIndex && <small>Current</small>}
            </li>
          ))}
        </ol>
      )}

      <div className="track-order-details">
        <div>
          <span>Items</span>
          <ul>
            {order.items.map((item) => (
              <li key={item.productId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{money(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p>
            {FULFILLMENT_LABELS[order.fulfillment]} —{" "}
            {order.fulfillment === "delivery"
              ? order.deliveryAddress || "address confirmed by phone"
              : "The Branch Farm, Mahlabane"}
          </p>
        </div>
        <div>
          <span>Details</span>
          <ul>
            <li>
              <small>Customer</small>
              <small>{order.customer.name}</small>
            </li>
            <li>
              <small>Phone</small>
              <small>{order.customer.phone}</small>
            </li>
            <li>
              <small>Payment</small>
              <small>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</small>
            </li>
            {order.paymentMethod && (
              <li>
                <small>Method</small>
                <small>{order.paymentMethod}</small>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="track-total">
        <span>Order total</span>
        <strong>{money(order.total)}</strong>
      </div>
    </div>
  );
}
