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
  Tag,
  Truck,
  UserRound,
  Phone,
  Mail,
  MessageSquareText,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { PAYMENT_METHODS } from "@/lib/constants";
import { createOrder } from "@/lib/firebase/data";
import { checkoutSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();
  const { deliveryFee, freeDeliveryThreshold, formatMoney, promoCode, promoDiscountPercent } =
    useStoreConfig();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    fulfillment: "pickup" as "pickup" | "delivery",
    deliveryAddress: "",
    paymentMethod: PAYMENT_METHODS[0],
    notes: "",
    promo: "",
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
        <Link href="/shop" className="button button-primary">
          Browse the shop
        </Link>
      </section>
    );
  }

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const freeDelivery = subtotal >= freeDeliveryThreshold;
  const deliveryTotal = form.fulfillment === "delivery" ? (freeDelivery ? 0 : deliveryFee) : 0;

  const promoApplied =
    Boolean(promoCode) &&
    form.promo.trim().toLowerCase() === promoCode.toLowerCase();
  const discount = promoApplied ? (subtotal * promoDiscountPercent) / 100 : 0;
  const total = subtotal - discount + deliveryTotal;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
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
        subtotal: subtotal - discount,
        deliveryFee: deliveryTotal,
        total,
        customer: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
        },
        fulfillment: parsed.data.fulfillment,
        deliveryAddress: parsed.data.deliveryAddress || undefined,
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
          <Link href="/cart">
            <ArrowLeft size={15} /> Back to cart
          </Link>
          <span className="secure-checkout">
            <LockKeyhole size={15} /> Secure order
          </span>
        </div>

        <div className="checkout-title">
          <span className="eyebrow">Checkout</span>
          <h1>Place your order</h1>
          <p>No online payment required — settle by cash, EFT or mobile money on collection or delivery.</p>
        </div>

        {serverError && (
          <div className="checkout-server-error">
            <CircleAlert size={20} />
            <div>
              <strong>We couldn&apos;t place your order.</strong>
              <p>{serverError}</p>
              <a
                className="checkout-error-whatsapp"
                href={`https://wa.me/26876581804?text=${encodeURIComponent("Hello, I'd like to place an order.")}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageSquareText size={15} /> Or order on WhatsApp instead
              </a>
            </div>
          </div>
        )}

        <form className="checkout-layout" onSubmit={submit} noValidate>
          <div className="checkout-form-column">
            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>1</span>
                <div>
                  <h2>Your details</h2>
                  <p>So we can reach you about the order.</p>
                </div>
              </div>
              <div className="auth-field-grid">
                <label className="field">
                  <span>Full name</span>
                  <div className="input-with-icon">
                    <UserRound size={18} />
                    <input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" autoFocus />
                  </div>
                  {errors.name && <small className="field-error">{errors.name}</small>}
                </label>
                <label className="field">
                  <span>Phone</span>
                  <div className="input-with-icon">
                    <Phone size={18} />
                    <input value={form.phone} onChange={(e) => update("phone", e.target.value)} autoComplete="tel" inputMode="tel" placeholder="+268 …" />
                  </div>
                  {errors.phone && <small className="field-error">{errors.phone}</small>}
                </label>
              </div>
              <label className="field" style={{ marginTop: 17 }}>
                <span>
                  Email <em>(optional)</em>
                </span>
                <div className="input-with-icon">
                  <Mail size={18} />
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" placeholder="you@example.com" />
                </div>
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>
            </div>

            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>2</span>
                <div>
                  <h2>Collection or delivery</h2>
                  <p>How would you like to receive your order?</p>
                </div>
              </div>

              <fieldset className="whatsapp-choice">
                <legend>Fulfilment method</legend>
                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="pickup"
                    checked={form.fulfillment === "pickup"}
                    onChange={() => update("fulfillment", "pickup")}
                  />
                  <span>
                    <PackageCheck size={20} />
                    <strong>Pickup at the farm</strong>
                    <small>Free — collect from Mahlabane</small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="fulfillment"
                    value="delivery"
                    checked={form.fulfillment === "delivery"}
                    onChange={() => update("fulfillment", "delivery")}
                  />
                  <span>
                    <Truck size={20} />
                    <strong>Delivery</strong>
                    <small>{freeDelivery ? "Free over " + formatMoney(freeDeliveryThreshold) : formatMoney(deliveryFee) + " delivery fee"}</small>
                  </span>
                </label>
              </fieldset>

              {form.fulfillment === "delivery" ? (
                <>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Delivery address</span>
                    <div className="input-with-icon">
                      <MapPin size={18} />
                      <input
                        value={form.deliveryAddress}
                        onChange={(e) => update("deliveryAddress", e.target.value)}
                        placeholder="Area, street or landmark…"
                      />
                    </div>
                    {errors.deliveryAddress && <small className="field-error">{errors.deliveryAddress}</small>}
                  </label>
                  <div className={`delivery-result ${freeDelivery ? "free" : "arrange"}`}>
                    <Truck size={18} />
                    <div>
                      <strong>{freeDelivery ? "Free delivery" : "Delivery arranged"}</strong>
                      <p>
                        {freeDelivery
                          ? "Your order qualifies for free delivery."
                          : `Delivery is ${formatMoney(deliveryFee)}. We'll confirm the address when we call.`}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="delivery-result free">
                  <MapPin size={18} />
                  <div>
                    <strong>Free pickup</strong>
                    <p>Collect from the farm. We'll confirm a time when we call.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-card">
              <div className="checkout-card-head">
                <span>3</span>
                <div>
                  <h2>Payment &amp; notes</h2>
                  <p>You pay when you collect or receive the order.</p>
                </div>
              </div>

              <label className="field">
                <span>Preferred payment method</span>
                <select value={form.paymentMethod} onChange={(e) => update("paymentMethod", e.target.value)}>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>

              {Boolean(promoCode) && (
                <label className="field" style={{ marginTop: 16 }}>
                  <span>
                    Promo code <em>(optional)</em>
                  </span>
                  <div className="input-with-icon">
                    <Tag size={18} />
                    <input
                      value={form.promo}
                      onChange={(e) => update("promo", e.target.value)}
                      placeholder="Enter a promo code"
                    />
                  </div>
                  {promoApplied && (
                    <small style={{ color: "var(--success)" }}>
                      Code applied — {promoDiscountPercent}% off.
                    </small>
                  )}
                </label>
              )}

              <label className="field" style={{ marginTop: 16 }}>
                <span>
                  Order notes <em>(optional)</em>
                </span>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Anything we should know…"
                />
                {errors.notes && <small className="field-error">{errors.notes}</small>}
              </label>

              <div className="agreement-summary" style={{ marginTop: 16 }}>
                <PackageCheck size={18} />
                <p>
                  You&apos;ll receive an order reference. A member of the farm team will contact you
                  to confirm availability, timing and payment.
                </p>
              </div>

              <label className="check-field">
                <input
                  type="checkbox"
                  checked={form.agree}
                  onChange={(e) => update("agree", e.target.checked)}
                />
                <span>
                  <i>✓</i>
                  I confirm my order details are correct and I agree to be contacted about this order.
                </span>
              </label>
              {errors.agree && <small className="field-error">{errors.agree}</small>}
            </div>
          </div>

          <aside className="checkout-summary">
            <h2>Your order</h2>
            <div className="checkout-summary-items">
              {lines.map((line) => (
                <div key={line.productId}>
                  <span className="checkout-item-image">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <i>
                        <ShoppingBag size={20} />
                      </i>
                    )}
                    <i>{line.quantity}</i>
                  </span>
                  <p>
                    <strong>{line.name}</strong>
                    <small>
                      {formatMoney(line.price)} × {line.quantity}
                    </small>
                  </p>
                  <strong>{formatMoney(line.price * line.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <p>
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </p>
              {promoApplied && (
                <p>
                  <span>Discount ({promoDiscountPercent}%)</span>
                  <span>-{formatMoney(discount)}</span>
                </p>
              )}
              <p>
                <span>Delivery</span>
                <span>{deliveryTotal === 0 ? "Free" : formatMoney(deliveryTotal)}</span>
              </p>
              <div>
                <span>Total</span>
                <strong>{formatMoney(total)}</strong>
              </div>
              <small>Pay on collection or delivery — no online payment.</small>
            </div>
            <button className="button button-primary button-large button-full" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="button-spinner" /> Placing order…
                </>
              ) : (
                <>
                  Place order <ArrowLeft size={18} style={{ transform: "rotate(180deg)" }} />
                </>
              )}
            </button>
            <div className="checkout-security">
              <LockKeyhole size={14} /> Your details are only used to fulfil this order.
            </div>
            <div className="checkout-location">
              <MapPin size={14} /> The Branch Farm · GG67+P95 Mahlabane, Eswatini
            </div>
          </aside>
        </form>
      </div>
    </section>
  );
}
