"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, FileText, MessageSquareText, Phone, Receipt, ShoppingBag, MapPin } from "lucide-react";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SignaturePad } from "@/components/store/SignaturePad";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { FULFILLMENT_LABELS, ORDER_STATUS_LABELS, ORDER_STATUS_FLOW, BUSINESS } from "@/lib/constants";
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

  if (loading) return <div className="dashboard-stack"><Loading label="Loading order…" /></div>;
  if (!order) return (
    <div className="dashboard-stack">
      <div className="empty-state compact"><h3>Order not found</h3><Link className="button button-primary" href="/orders">Back to orders</Link></div>
    </div>
  );

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status);

  const changeStatus = async (status: OrderStatus) => {
    setSaving(true);
    await updateOrder(order.id, { status });
    setOrder({ ...order, status });
    setSaving(false);
    showToast(`Order marked ${ORDER_STATUS_LABELS[status]}`, "success");
  };

  const togglePaid = async () => {
    const next = order.paymentStatus === "paid" ? "unpaid" : "paid";
    setSaving(true);
    await updateOrder(order.id, { paymentStatus: next });
    setOrder({ ...order, paymentStatus: next });
    setSaving(false);
    showToast(`Payment ${next}`, "success");
  };

  const saveSignature = async (signature: string) => {
    setSaving(true);
    const signedAt = new Date().toISOString();
    await updateOrder(order.id, { signature, signedByName: user?.fullName || "Team", signedAt });
    setOrder({ ...order, signature, signedByName: user?.fullName || "Team", signedAt });
    setSaving(false);
    showToast("Signature saved", "success");
  };

  return (
    <div className="dashboard-stack">
      <Link href="/orders" className="text-link"><ArrowLeft size={16} /> Back to orders</Link>

      <section className="dashboard-welcome" style={{ justifyContent: "space-between" }}>
        <div>
          <span>Order Number</span>
          <h2>{order.reference}</h2>
          <p>{order.customer.name} · {order.customer.phone} · {formatDate(order.createdAt, true)}</p>
          <p style={{ fontSize: ".75rem", marginTop: 4 }}><MapPin size={12} /> Delivery Location: {order.deliveryAddress || order.deliveryLocation || FULFILLMENT_LABELS[order.fulfillment]}</p>
        </div>
        <StatusBadge status={order.status} />
      </section>

      <div className="dashboard-two-columns">
        <div className="dashboard-panel">
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Products · Quantity · Total</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {order.items.map((item) => (
              <div key={item.productId} style={{ display: "flex", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: ".82rem" }}>{item.name} <small style={{ color: "var(--muted)" }}>× {item.quantity} {item.unit}</small></span>
                <strong style={{ fontSize: ".82rem" }}>{money(item.price * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 8, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem" }}><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem" }}><span>Delivery</span><span>{order.deliveryFee === 0 ? "Free" : money(order.deliveryFee)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 700 }}>Total</span><strong style={{ color: "var(--green-900)", fontFamily: "var(--serif)", fontSize: "1.3rem" }}>{money(order.total)}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Customer & Delivery Details</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <div><small>Customer</small><br /><strong>{order.customer.name}</strong></div>
            <div><small>Phone</small><br /><a href={phoneHref(order.customer.phone)} style={{ color: "var(--green-700)", fontWeight: 700 }}>{order.customer.phone}</a></div>
            {order.customer.email && <div><small>Email</small><br />{order.customer.email}</div>}
            <div><small>Delivery Location</small><br /><strong>{order.deliveryAddress || order.deliveryLocation || "—"}</strong><br /><small>{FULFILLMENT_LABELS[order.fulfillment]}</small></div>
            <div><small>Payment Status</small><br /><StatusBadge status={order.paymentStatus} /> · {order.paymentMethod || "—"}</div>
            <div><small>Order Status</small><br /><StatusBadge status={order.status} /></div>
            {order.notes && <div><small>Order Notes</small><br /><p style={{ fontSize: ".85rem" }}>{order.notes}</p></div>}
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button button-secondary button-small" href={phoneHref(order.customer.phone)}><Phone size={15} /> Call</a>
            <a className="button button-whatsapp button-small" href={whatsappHref(BUSINESS.whatsappLink, `Hello ${order.customer.name}, about order ${order.reference} - status ${ORDER_STATUS_LABELS[order.status]}`)} target="_blank" rel="noreferrer"><MessageSquareText size={15} /> WhatsApp Customer</a>
            <a className="button button-secondary button-small" target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/receipt?reference=${encodeURIComponent(order.reference)}&edit=1`}><Receipt size={15} /> Receipt</a>
            <a className="button button-secondary button-small" target="_blank" rel="noreferrer" href={`/api/orders/${order.id}/invoice?reference=${encodeURIComponent(order.reference)}&edit=1`}><FileText size={15} /> Invoice</a>
          </div>
        </div>
      </div>

      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Order Status — New, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled</h2>
        <ol className="order-timeline">
          {ORDER_STATUS_FLOW.map((step, index) => (
            <li key={step} className={index <= currentIndex ? "complete" : ""}><span>{index + 1}</span><strong>{ORDER_STATUS_LABELS[step]}</strong></li>
          ))}
        </ol>
        <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label className="field" style={{ minWidth: 200 }}><span>Update status</span>
            <select value={order.status} disabled={saving} onChange={(e) => changeStatus(e.target.value as OrderStatus)}>
              {Object.entries(ORDER_STATUS_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
            </select>
          </label>
          <button className="button button-secondary" style={{ marginTop: 18 }} onClick={togglePaid} disabled={saving}><ShoppingBag size={16} /> {order.paymentStatus === "paid" ? "Mark unpaid" : "Mark paid"}</button>
        </div>
      </section>

      <section className="dashboard-panel">
        <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Proof of delivery / Signature</h2>
        <p style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: -8, marginBottom: 12 }}>Sign here after delivery. The signature prints on the receipt &amp; invoice — with the signer&apos;s name and date, never a &ldquo;signed digitally&rdquo; marker.</p>
        {order.signature ? (
          <div style={{ display: "grid", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={order.signature} alt="Signature" style={{ maxWidth: 320, border: "1px solid var(--line)", borderRadius: 10 }} />
            <p style={{ fontSize: ".72rem" }}><Check size={14} /> Signed by {order.signedByName} {order.signedAt ? `on ${formatDate(order.signedAt, true)}` : ""}</p>
          </div>
        ) : <SignaturePad onSave={saveSignature} />}
      </section>
    </div>
  );
}
