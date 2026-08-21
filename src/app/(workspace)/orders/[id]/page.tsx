"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, MapPin, MessageSquareText, Phone, Receipt, ShoppingBag } from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SignaturePad } from "@/components/store/SignaturePad";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  FULFILLMENT_LABELS,
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/constants";
import { getOrder, updateOrder } from "@/lib/firebase/data";
import { formatDate, money, phoneHref, whatsappHref } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOrder(params.id).then((found) => {
      setOrder(found);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="dashboard-stack">
        <Loading label="Loading order…" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="dashboard-stack">
        <div className="empty-state compact">
          <h3>Order not found</h3>
          <p>This order may have been removed.</p>
          <Link className="button button-primary" href="/orders">
            Back to orders
          </Link>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  const notifyCustomer = () => {
    const message = `Hello ${order.customer.name.split(" ")[0] || "there"}, your order ${order.reference} is now ${ORDER_STATUS_LABELS[order.status].toLowerCase()}. — The Branch Farm`;
    window.open(whatsappHref("26876581804", message), "_blank");
  };

  const saveSignature = async (signature: string) => {
    setSaving(true);
    await updateOrder(order.id, {
      signature,
      signedByName: user?.fullName || "Team member",
      signedAt: new Date().toISOString(),
    });
    setOrder({
      ...order,
      signature,
      signedByName: user?.fullName || "Team member",
      signedAt: new Date().toISOString(),
    });
    setSaving(false);
    showToast("Signature saved", "success");
  };

  const changeStatus = async (status: OrderStatus) => {
    setSaving(true);
    await updateOrder(order.id, { status });
    setOrder({ ...order, status });
    setSaving(false);
    showToast(`Order marked ${ORDER_STATUS_LABELS[status].toLowerCase()}`, "success");
  };

  const togglePaid = async () => {
    const next = order.paymentStatus === "paid" ? "unpaid" : "paid";
    setSaving(true);
    await updateOrder(order.id, { paymentStatus: next });
    setOrder({ ...order, paymentStatus: next });
    setSaving(false);
    showToast(`Order marked ${PAYMENT_STATUS_LABELS[next].toLowerCase()}`, "success");
  };

  return (
    <div className="dashboard-stack">
      <Link href="/orders" className="text-link">
        <ArrowLeft size={16} /> Back to orders
      </Link>

      <section className="dashboard-welcome" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span>Order</span>
          <h2>{order.reference}</h2>
          <p>
            {order.customer.name} · {formatDate(order.createdAt, true)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </section>

      <div className="dashboard-two-columns">
        <div className="dashboard-panel">
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Items</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {order.items.map((item) => (
              <div
                key={item.productId}
                style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}
              >
                <span style={{ fontSize: ".82rem" }}>
                  {item.name} <small style={{ color: "var(--muted)" }}>× {item.quantity}</small>
                </span>
                <strong style={{ fontSize: ".82rem" }}>{money(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 8,
              paddingTop: 14,
              borderTop: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem" }}>
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem" }}>
              <span>Delivery</span>
              <span>{order.deliveryFee === 0 ? "Free" : money(order.deliveryFee)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: ".85rem", fontWeight: 700 }}>Total</span>
              <strong style={{ color: "var(--green-900)", fontFamily: "var(--serif)", fontSize: "1.3rem" }}>
                {money(order.total)}
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Customer &amp; delivery</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                Customer
              </small>
              <strong style={{ fontSize: ".86rem" }}>{order.customer.name}</strong>
            </div>
            <div>
              <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                Phone
              </small>
              <a href={phoneHref(order.customer.phone)} style={{ color: "var(--green-700)", fontWeight: 700 }}>
                {order.customer.phone}
              </a>
            </div>
            {order.customer.email && (
              <div>
                <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                  Email
                </small>
                <span style={{ fontSize: ".86rem" }}>{order.customer.email}</span>
              </div>
            )}
            <div>
              <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                Fulfilment
              </small>
              <span style={{ fontSize: ".86rem" }}>{FULFILLMENT_LABELS[order.fulfillment]}</span>
              {order.fulfillment === "delivery" && order.deliveryAddress && (
                <p style={{ marginTop: 4, fontSize: ".74rem" }}>{order.deliveryAddress}</p>
              )}
            </div>
            {order.paymentMethod && (
              <div>
                <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                  Preferred payment
                </small>
                <span style={{ fontSize: ".86rem" }}>{order.paymentMethod}</span>
              </div>
            )}
            {order.notes && (
              <div>
                <small className="dashboard-footnote" style={{ fontSize: ".62rem", color: "var(--muted)" }}>
                  Notes
                </small>
                <p style={{ fontSize: ".8rem", color: "var(--ink)" }}>{order.notes}</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button button-secondary button-small" href={phoneHref(order.customer.phone)}>
              <Phone size={15} /> Call
            </a>
            <a
              className="button button-whatsapp button-small"
              href={whatsappHref("26876581804", `Hello ${order.customer.name.split(" ")[0]}, about your order ${order.reference}…`)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageSquareText size={15} /> WhatsApp
            </a>
            <button className="button button-secondary button-small" onClick={notifyCustomer}>
              <MessageSquareText size={15} /> Notify status
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a
              className="button button-secondary button-small"
              target="_blank"
              rel="noreferrer"
              href={`/api/orders/${order.id}/receipt?reference=${encodeURIComponent(order.reference)}`}
            >
              <Receipt size={15} /> Print receipt
            </a>
            <a
              className="button button-secondary button-small"
              target="_blank"
              rel="noreferrer"
              href={`/api/orders/${order.id}/invoice?reference=${encodeURIComponent(order.reference)}`}
            >
              <FileText size={15} /> Print invoice
            </a>
          </div>
        </div>
      </div>

      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Progress</h2>
        <ol className="order-timeline">
          {ORDER_STATUS_FLOW.map((step, index) => (
            <li
              key={step}
              className={index <= currentIndex ? "complete" : index === currentIndex + 1 ? "current" : ""}
            >
              <span>{index + 1}</span>
              <strong>{ORDER_STATUS_LABELS[step]}</strong>
            </li>
          ))}
        </ol>

        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="field" style={{ minWidth: 200 }}>
            <span>Update status</span>
            <select
              value={order.status}
              disabled={saving}
              onChange={(e) => changeStatus(e.target.value as OrderStatus)}
            >
              {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button button-secondary"
            style={{ marginTop: 18 }}
            onClick={togglePaid}
            disabled={saving}
          >
            <ShoppingBag size={16} />{" "}
            {order.paymentStatus === "paid" ? "Mark as unpaid" : "Mark as paid"}
          </button>
        </div>
      </section>

      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>
          Proof of delivery
        </h2>
        {order.signature ? (
          <div style={{ display: "grid", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.signature}
              alt="Customer signature"
              style={{ maxWidth: 320, background: "#fff", border: "1px solid var(--line)", borderRadius: 10 }}
            />
            <p style={{ fontSize: ".72rem", color: "var(--muted)" }}>
              <Check size={14} style={{ verticalAlign: "-2px", color: "var(--success)" }} /> Signed
              by {order.signedByName || "customer"}
              {order.signedAt ? ` on ${formatDate(order.signedAt, true)}` : ""}
            </p>
          </div>
        ) : (
          <SignaturePad onSave={saveSignature} />
        )}
      </section>
    </div>
  );
}
