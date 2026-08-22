"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CircleAlert, PackageSearch, Search, ShieldCheck, Truck, RefreshCcw } from "lucide-react";
import { FULFILLMENT_LABELS, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, BUSINESS } from "@/lib/constants";
import { lookupOrderByReference, type LookupOrderResult } from "@/lib/firebase/data";
import { formatDate } from "@/lib/utils";
import type { Order } from "@/types";

export default function TrackPage() {
  return (
    <Suspense fallback={<TrackPlaceholder />}>
      <TrackContent />
    </Suspense>
  );
}

function TrackPlaceholder() {
  return (
    <section className="page-hero track-hero">
      <div className="container page-hero-inner">
        <span className="eyebrow eyebrow-light">{BUSINESS.name} · {BUSINESS.slogan} — My Orders</span>
        <h1>Order tracking</h1>
        <p>Loading order tracking…</p>
      </div>
    </section>
  );
}

function TrackContent() {
  const searchParams = useSearchParams();
  const urlReference = (searchParams.get("ref") || "").trim().toUpperCase();
  const [reference, setReference] = useState(urlReference);
  const [order, setOrder] = useState<Order | null>(null);
  const [result, setResult] = useState<Extract<LookupOrderResult, { status: "not-found" | "unavailable" }> | null>(null);
  const [loading, setLoading] = useState(false);
  const autoRun = useRef(false);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const value = reference.trim().toUpperCase();
    if (!value) return;
    setLoading(true);
    setResult(null);
    const found = await lookupOrderByReference(value);
    if (found.status === "found") {
      setOrder(found.order);
      setResult(null);
    } else {
      setOrder(null);
      setResult(found);
    }
    setLoading(false);
  };

  // ?ref=TB-XXXXXX from the order success page: run the lookup automatically.
  useEffect(() => {
    if (urlReference && !autoRun.current) {
      autoRun.current = true;
      setReference(urlReference);
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReference]);

  return (
    <>
      <section className="page-hero track-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">{BUSINESS.name} · {BUSINESS.slogan} — My Orders</span>
          <h1>Order tracking</h1>
          <p>Enter order number to see status: New, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled. {BUSINESS.deliveryFree}</p>
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
              {!order && !result && (
                <div className="track-placeholder">
                  <span><Truck size={30} /></span>
                  <h2>Track an order</h2>
                  <p>Enter reference from your confirmation to see its progress. For privacy, tracking shows status only.</p>
                </div>
              )}
              {result?.status === "not-found" && (
                <div className="track-not-found">
                  <span><CircleAlert size={30} /></span>
                  <h2>Order not found</h2>
                  <p>We couldn&apos;t find an order with that reference. Check the number on your confirmation, receipt or invoice.</p>
                </div>
              )}
              {result?.status === "unavailable" && (
                <div className="track-not-found">
                  <span><CircleAlert size={30} /></span>
                  <h2>Couldn&apos;t check right now</h2>
                  <p>{result.message || "Order tracking is temporarily unavailable. Try again in a moment or contact the farm."}</p>
                  <button type="button" className="button button-secondary" onClick={submit} disabled={loading}>
                    <RefreshCcw size={16} /> Try again
                  </button>
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
        <div><small>Order Number</small><h2>{order.reference}</h2><p>Placed {formatDate(order.createdAt, true)} · {FULFILLMENT_LABELS[order.fulfillment]}</p></div>
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
      <div className="track-privacy-note"><ShieldCheck size={16} /> For your privacy, tracking shows status only. Your full order details are in your confirmation.</div>
    </div>
  );
}
