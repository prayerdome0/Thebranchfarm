"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, MessageSquareText, PackageCheck, Receipt, RefreshCcw } from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import { FULFILLMENT_LABELS } from "@/lib/constants";
import { lookupOrderByReference, type LookupOrderResult } from "@/lib/firebase/data";
import { getLocalOrder } from "@/lib/store";
import { money } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderSuccessPage() {
  const params = useParams<{ reference: string }>();
  const reference = (params.reference || "").toUpperCase();
  const { showToast } = useToast();
  // Orders placed on this device are readable instantly, so the success page
  // never 404s after checkout; the effect below refreshes the live status.
  const [order, setOrder] = useState<Order | null>(() => getLocalOrder(reference));
  const [lookup, setLookup] = useState<Extract<LookupOrderResult, { status: "not-found" | "unavailable" }> | null>(null);
  const [loading, setLoading] = useState(() => !getLocalOrder(reference));

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    lookupOrderByReference(reference).then((result) => {
      if (cancelled) return;
      if (result.status === "found") {
        // Public tracking returns status only; keep the customer's full local
        // copy and just refresh the live status from the lookup.
        setOrder((prev) => {
          const local = prev || getLocalOrder(reference);
          if (local) return { ...local, status: result.order.status, updatedAt: result.order.updatedAt ?? local.updatedAt };
          return result.order;
        });
        setLookup(null);
      } else if (!getLocalOrder(reference)) {
        setOrder(null);
        setLookup(result);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const retry = () => {
    if (!reference) return;
    setLoading(true);
    setLookup(null);
    lookupOrderByReference(reference).then((result) => {
      if (result.status === "found") {
        setOrder((prev) => {
          const local = prev || getLocalOrder(reference);
          if (local) return { ...local, status: result.order.status, updatedAt: result.order.updatedAt ?? local.updatedAt };
          return result.order;
        });
        setLookup(null);
      } else {
        setOrder(null);
        setLookup(result);
      }
      setLoading(false);
    });
  };

  if (loading) {
    return (
      <section className="page-shell" style={{ display: "grid", placeItems: "center" }}>
        <Loading label="Loading your order…" />
      </section>
    );
  }

  if (!order && lookup?.status === "unavailable") {
    return (
      <section className="page-shell not-found-panel">
        <span>⏳</span>
        <h1>We couldn&apos;t load your order.</h1>
        <p>
          Reference <strong>{reference}</strong> was placed, but the order service is
          unavailable right now. Try again in a moment or contact the farm.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="button button-primary" onClick={retry} disabled={loading}>
            <RefreshCcw size={16} /> Try again
          </button>
          <Link href="/track" className="button button-secondary">
            Track an order
          </Link>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page-shell not-found-panel">
        <span>404</span>
        <h1>Order not found.</h1>
        <p>We couldn&apos;t find an order with reference {reference || ""}.</p>
        <p>Check the number on your confirmation, receipt or invoice.</p>
        <Link href="/track" className="button button-primary">
          Track an order
        </Link>
      </section>
    );
  }


  const copyReference = () => {
    try {
      navigator.clipboard?.writeText(order.reference);
      showToast("Order reference copied", "success");
    } catch {
      showToast("Could not copy reference", "error");
    }
  };

  return (
    <section className="success-page">
      <div className="container success-card" style={{ margin: "80px auto" }}>
        <span className="success-seal">
          <Check size={34} />
        </span>
        <h1>Order received!</h1>
        <p>
          Thank you, {order.customer.name.split(" ")[0]}. Your order has been placed. A member of
          the farm team will contact you shortly to confirm.
        </p>

        <div className="order-number-box">
          <span>Order reference</span>
          <div>
            <strong>{order.reference}</strong>
            <button onClick={copyReference} aria-label="Copy order reference">
              <Copy size={17} />
            </button>
          </div>
        </div>

        <div className="success-summary">
          <span>
            <strong>{money(order.total)}</strong>
            <small>Total · pay on collection/delivery</small>
          </span>
          <span>
            <strong>{FULFILLMENT_LABELS[order.fulfillment]}</strong>
            <small>{order.fulfillment === "delivery" ? order.deliveryAddress || "Address confirmed by phone" : "The Branch Farm, Mahlabane"}</small>
          </span>
        </div>

        <div className="success-actions">
          <Link className="button button-primary" href={`/track?ref=${encodeURIComponent(order.reference)}`}>
            Track this order <PackageCheck size={18} />
          </Link>
          {order.paymentStatus === "paid" && (
            <a
              className="button button-secondary"
              href={`/api/orders/${order.id}/receipt?reference=${encodeURIComponent(order.reference)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Receipt size={18} /> Print receipt
            </a>
          )}
          <a
            className="button button-whatsapp"
            href={`https://wa.me/26876581804?text=${encodeURIComponent(`Hello, I placed order ${order.reference}.`)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageSquareText size={18} /> WhatsApp the farm
          </a>
        </div>
        <p className="success-whatsapp-note" style={{ marginTop: 12 }}>
          Keep your reference — you&apos;ll use it to track progress.
        </p>

        <div className="success-next">
          <h2>What happens next?</h2>
          <ol>
            <li>
              <span>1</span>
              <p>
                <strong>We confirm</strong>
                <small>A team member calls to confirm your order.</small>
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <strong>We prepare</strong>
                <small>Your items are collected and packed.</small>
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                <strong>You receive</strong>
                <small>Collect or get it delivered, then pay.</small>
              </p>
            </li>
          </ol>
        </div>

        <div className="success-shop-link">
          <Link className="text-link" href="/shop">
            Continue shopping <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
