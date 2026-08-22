"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Phone,
  Mail,
  MessageSquareText,
  Navigation,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { BUSINESS, PAYMENT_METHODS } from "@/lib/constants";
import { createOrder } from "@/lib/firebase/data";
import { checkoutSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";
import { getCartWhatsAppLink } from "@/lib/whatsapp";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const { deliveryFee, freeDeliveryThreshold, formatMoney } = useStoreConfig();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    fulfillment: "pickup" as "pickup" | "delivery",
    deliveryLocation: "",
    deliveryAddress: "",
    paymentMethod: PAYMENT_METHODS[0],
    notes: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!lines.length) {
    return (
      <section className="section checkout-empty page-shell">
        <h1>Nothing to check out yet.</h1>
        <p>Your cart is empty. Add some products first.</p>
        <Link href="/shop" className="button button-primary">Browse the shop</Link>
      </section>
    );
  }

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const freeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryTotal = form.fulfillment === "delivery" ? (freeDelivery ? 0 : deliveryFee) : 0;
  const total = subtotal + deliveryTotal;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = checkoutSchema.safeParse({ ...form, promo: "" });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    if (form.fulfillment === "delivery" && !form.deliveryLocation.trim()) {
      setErrors({ deliveryLocation: "Enter your delivery location (e.g. Manzini, Matsapha)" });
      return;
    }
    setErrors({});
    setServerError("");
    setSubmitting(true);
    try {
      const order = await createOrder({
        items: lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          unit: line.unit,
          price: line.price,
          quantity: line.quantity,
          image: line.image,
        })),
        subtotal,
        deliveryFee: deliveryTotal,
        total,
        customer: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
        },
        fulfillment: parsed.data.fulfillment,
        deliveryAddress: form.fulfillment === "delivery" ? `${form.deliveryLocation} - ${form.deliveryAddress}` : undefined,
        notes: parsed.data.notes || undefined,
        paymentMethod: parsed.data.paymentMethod || undefined,
      });
      clear();
      router.replace(`/order/${order.reference}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setServerError(/stock/i.test(message) ? message : friendlyError(cause));
      setSubmitting(false);
    }
  };

  return (
    <section className="checkout-section">
      <div className="container checkout-container">
        <div className="checkout-top">
          <Link href="/cart"><ArrowLeft size={15} /> Back to cart</Link>
          <span className="secure-checkout"><LockKeyhole size={15} /> Secure order · {BUSINESS.name}</span>
        </div>

        <div className="checkout-title">
          <span className="eyebrow">Checkout · {BUSINESS.slogan}</span>
          <h1>Place your order</h1>
          <p>{BUSINESS.deliveryFree} {BUSINESS.deliveryOther} Pay on collection or delivery.</p>
        </div>

        {serverError && (
          <div className="checkout-server-error">
            <CircleAlert size={20} />
            <div>
              <strong>We couldn&apos;t place your order.</strong>
              <p>{serverError}</p>
              <a className="checkout-error-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}?text=${encodeURIComponent("Hello, I'd like to place an order.")}`} target="_blank" rel="noreferrer">
                <MessageSquareText size={15} /> Or order on WhatsApp instead
              </a>
            </div>
          </div>
        )}

        <form className="checkout-layout" onSubmit={submit} noValidate>
          <div className="checkout-form-column">
            {/* Customer */}
            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>1</span>
                <div><h2>Customer details</h2><p>Name, phone, email for order confirmation.</p></div>
              </div>
              <div className="auth-field-grid">
                <label className="field">
                  <span>Customer name *</span>
                  <div className="input-with-icon"><UserRound size={18} /><input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" autoFocus placeholder="Full name" /></div>
                  {errors.name && <small className="field-error">{errors.name}</small>}
                </label>
                <label className="field">
                  <span>Phone number *</span>
                  <div className="input-with-icon"><Phone size={18} /><input value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+268 …" /></div>
                  {errors.phone && <small className="field-error">{errors.phone}</small>}
                </label>
              </div>
              <label className="field" style={{ marginTop: 17 }}>
                <span>Email</span>
                <div className="input-with-icon"><Mail size={18} /><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="you@example.com" /></div>
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>
            </div>

            {/* Delivery */}
            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>2</span>
                <div><h2>Delivery information</h2><p>{BUSINESS.deliveryFree} {BUSINESS.deliveryOther}</p></div>
              </div>

              <fieldset className="whatsapp-choice">
                <legend>How to receive</legend>
                <label>
                  <input type="radio" name="fulfillment" value="pickup" checked={form.fulfillment === "pickup"} onChange={() => update("fulfillment", "pickup")} />
                  <span><PackageCheck size={20} /><strong>Pickup at farm</strong><small>Free — Mahlabane</small></span>
                </label>
                <label>
                  <input type="radio" name="fulfillment" value="delivery" checked={form.fulfillment === "delivery"} onChange={() => update("fulfillment", "delivery")} />
                  <span><Truck size={20} /><strong>Delivery</strong><small>{freeDelivery ? "Free over " + formatMoney(freeDeliveryThreshold) : formatMoney(deliveryFee) + " fee"}</small></span>
                </label>
              </fieldset>

              {form.fulfillment === "delivery" && (
                <>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Delivery location * (e.g. Manzini, Matsapha, Mbabane)</span>
                    <div className="input-with-icon"><Navigation size={18} /><input value={form.deliveryLocation} onChange={(e) => update("deliveryLocation", e.target.value)} placeholder="Manzini, Matsapha, etc" /></div>
                    {errors.deliveryLocation && <small className="field-error">{errors.deliveryLocation}</small>}
                  </label>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Address / details</span>
                    <div className="input-with-icon"><MapPin size={18} /><input value={form.deliveryAddress} onChange={(e) => update("deliveryAddress", e.target.value)} placeholder="Street, area, landmark…" /></div>
                  </label>
                  <div className={`delivery-result ${freeDelivery ? "free" : "arrange"}`}>
                    <Truck size={18} />
                    <div>
                      <strong>{freeDelivery ? "Free delivery" : "Delivery arranged"}</strong>
                      <p>{freeDelivery ? `Free around Manzini & Matsapha. Order qualifies.` : `Delivery is ${formatMoney(deliveryFee)} around Manzini/Matsapha, other locations arranged.`}</p>
                    </div>
                  </div>
                </>
              )}

              {form.fulfillment === "pickup" && (
                <div className="delivery-result free">
                  <MapPin size={18} />
                  <div><strong>Free pickup at farm</strong><p>{BUSINESS.fullLocation} — we confirm time when we call.</p></div>
                </div>
              )}
            </div>

            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>3</span>
                <div><h2>Order notes & payment</h2><p>Pay on collection/delivery.</p></div>
              </div>

              <label className="field">
                <span>Payment method</span>
                <select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
              </label>

              <label className="field" style={{ marginTop: 16 }}>
                <span>Order notes</span>
                <textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything we should know… delivery instructions, etc" />
              </label>

              <div className="agreement-summary" style={{ marginTop: 16 }}>
                <PackageCheck size={18} />
                <p>You&apos;ll receive an order number and confirmation. Admin is notified. Track your order with the reference. A customer record is created for future orders.</p>
              </div>

              <label className="check-field">
                <input type="checkbox" checked={form.agree} onChange={(e) => update("agree", e.target.checked)} />
                <span><i>✓</i> I confirm details are correct and agree to be contacted.</span>
              </label>
              {errors.agree && <small className="field-error">{errors.agree}</small>}
            </div>
          </div>

          <aside className="checkout-summary">
            <h2>Order summary</h2>
            <p style={{ fontSize: ".7rem", color: "var(--muted)", marginBottom: 12 }}>Products · Quantity · Subtotal · Delivery · Total</p>
            <div className="checkout-summary-items">
              {lines.map((line) => (
                <div key={line.productId}>
                  <span className="checkout-item-image">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (<i><ShoppingBag size={20} /></i>)}
                    <i>{line.quantity}</i>
                  </span>
                  <p><strong>{line.name}</strong><small>{formatMoney(line.price)} × {line.quantity}</small></p>
                  <strong>{formatMoney(line.price * line.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <p><span>Products ({lines.reduce((s, l) => s + l.quantity, 0)})</span><span>{formatMoney(subtotal)}</span></p>
              <p><span>Delivery</span><span>{deliveryTotal === 0 ? "Free" : formatMoney(deliveryTotal)}</span></p>
              <div><span>Total</span><strong>{formatMoney(total)}</strong></div>
              <small>{BUSINESS.deliveryFree} {BUSINESS.deliveryOther}</small>
            </div>
            <button className="button button-primary button-large button-full" disabled={submitting}>
              {submitting ? <><i className="button-spinner" /> Placing…</> : <>Place order <ArrowLeft size={18} style={{ transform: "rotate(180deg)" }} /></>}
            </button>
            <a className="button button-whatsapp button-full" href={getCartWhatsAppLink(lines, subtotal, { name: form.name, phone: form.phone, deliveryLocation: form.deliveryLocation })} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
              <MessageSquareText size={16} /> Order on WhatsApp
            </a>
            <div className="checkout-security"><LockKeyhole size={14} /> Details only used for this order. Customer record created.</div>
            <div className="checkout-location"><MapPin size={14} /> {BUSINESS.name} · {BUSINESS.fullLocation}</div>
          </aside>
        </form>
      </div>
    </section>
  );
}
