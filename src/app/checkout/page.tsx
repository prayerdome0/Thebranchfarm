"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ChevronRight, CircleAlert, LockKeyhole, MapPin, MessageCircle, ShieldCheck, Truck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad } from "@/components/forms/SignaturePad";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { createOrder } from "@/lib/firebase/data";
import { checkoutSchema } from "@/lib/validation";
import { deliveryDetails, friendlyError, money } from "@/lib/utils";

const initialForm = { fullName: "", phone: "", email: "", location: "", address: "", instructions: "", whatsappAvailable: true, agreementAccepted: false, signature: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, subtotal, clearCart, hydrated } = useCart();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const delivery = useMemo(() => deliveryDetails(form.location), [form.location]);
  const total = subtotal + (delivery.fee || 0);

  useEffect(() => {
    if (user) setForm((current) => ({ ...current, fullName: current.fullName || user.fullName, phone: current.phone || user.phone, email: current.email || user.email }));
  }, [user]);

  if (hydrated && !items.length) return <section className="page-shell checkout-empty"><h1>Your cart is empty</h1><p>Add a product before opening checkout.</p><Link href="/shop" className="button button-primary">Go to the shop</Link></section>;

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      try {
        document.querySelector(".field-error")?.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
      return;
    }
    setErrors({}); setServerError(""); setSubmitting(true);
    try {
      const response = await createOrder({
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        customer: { fullName: parsed.data.fullName, phone: parsed.data.phone, email: parsed.data.email || undefined, whatsappAvailable: parsed.data.whatsappAvailable },
        delivery: { address: parsed.data.address, location: parsed.data.location, instructions: parsed.data.instructions },
        agreementAccepted: true,
        signature: parsed.data.signature,
      });
      const summary = { ...response, customer: parsed.data.fullName, phone: parsed.data.phone, whatsappAvailable: parsed.data.whatsappAvailable, location: parsed.data.location, instructions: parsed.data.instructions, items: items.map(({ product, quantity }) => ({ name: product.name, quantity, price: product.price, unit: product.unit })) };
      try {
        sessionStorage.setItem(`order-success:${response.orderNumber}`, JSON.stringify(summary));
      } catch {}
      clearCart();
      router.push(`/order-success/${response.orderNumber}`);
    } catch (error) {
      setServerError(friendlyError(error)); setSubmitting(false);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    }
  };

  return (
    <section className="checkout-section"><div className="container checkout-container"><div className="checkout-top"><Link href="/cart"><ArrowLeft size={17} /> Back to cart</Link><div className="secure-checkout"><LockKeyhole size={16} /> Secure checkout</div></div><div className="checkout-title"><span className="eyebrow">Almost there</span><h1>Delivery &amp; agreement</h1><p>Official prices are checked again by the secure order service before your order is recorded.</p></div>
      {serverError && <div className="checkout-server-error"><CircleAlert size={22} /><div><strong>We couldn&apos;t place the order</strong><p>{serverError} Your cart has been kept safely.</p></div></div>}
      <form onSubmit={submit} className="checkout-layout" noValidate><div className="checkout-form-column">
        <section className="checkout-card"><div className="checkout-card-head"><span>1</span><div><h2>Your details</h2><p>How should our team contact you?</p></div></div><div className="form-grid"><label className="field field-full"><span>Full name *</span><div className="input-with-icon"><UserRound size={18} /><input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} autoComplete="name" /></div>{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label><label className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => update("phone", e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+268 …" />{errors.phone && <small className="field-error">{errors.phone}</small>}</label><label className="field"><span>Email <em>optional</em></span><input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" autoComplete="email" />{errors.email && <small className="field-error">{errors.email}</small>}</label></div><fieldset className="whatsapp-choice"><legend>Do you use WhatsApp on this number?</legend><label><input type="radio" checked={form.whatsappAvailable} onChange={() => update("whatsappAvailable", true)} /><span><MessageCircle size={18} /><strong>Yes</strong><small>Show a WhatsApp option after saving</small></span></label><label><input type="radio" checked={!form.whatsappAvailable} onChange={() => update("whatsappAvailable", false)} /><span><UserRound size={18} /><strong>No</strong><small>Call or email me instead</small></span></label></fieldset><p className="choice-note">WhatsApp is optional and never blocks an order.</p></section>
        <section className="checkout-card"><div className="checkout-card-head"><span>2</span><div><h2>Delivery</h2><p>Tell us where this order should go.</p></div></div><div className="form-grid"><label className="field"><span>Town / location *</span><select value={form.location} onChange={(e) => update("location", e.target.value)}><option value="">Select location</option><option>Manzini</option><option>Matsapha</option><option>Ngculwini</option><option value="Other location">Other location</option></select>{errors.location && <small className="field-error">{errors.location}</small>}</label><label className="field"><span>Address / meeting point *</span><input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Area, landmark or collection point" />{errors.address && <small className="field-error">{errors.address}</small>}</label><label className="field field-full"><span>Delivery instructions <em>optional</em></span><textarea value={form.instructions} onChange={(e) => update("instructions", e.target.value)} rows={3} placeholder="Anything our delivery team should know?" /></label></div>{form.location && <div className={`delivery-result ${delivery.fee === 0 ? "free" : "arrange"}`}><Truck size={20} /><div><strong>{delivery.label}</strong><p>{delivery.fee === 0 ? `Current free delivery applies around ${form.location}.` : "Our team will contact you to arrange delivery. No fee has been added."}</p></div></div>}</section>
        <section className="checkout-card agreement-card"><div className="checkout-card-head"><span>3</span><div><h2>Review &amp; sign</h2><p>Your signed order cannot be silently changed.</p></div></div><div className="agreement-summary"><ShieldCheck size={21} /><p>I confirm that the information above is correct. I agree to purchase the listed products at the stated official price and confirm that I have ordered the quantities shown.</p></div><label className="check-field"><input type="checkbox" checked={form.agreementAccepted} onChange={(e) => update("agreementAccepted", e.target.checked)} /><span><i><Check size={14} /></i>I confirm and accept the purchase agreement.</span></label>{errors.agreementAccepted && <small className="field-error standalone-error">{errors.agreementAccepted}</small>}<SignaturePad value={form.signature} onChange={(value) => update("signature", value)} disabled={submitting} />{errors.signature && <small className="field-error standalone-error">{errors.signature}</small>}</section>
      </div>
      <aside className="checkout-summary"><h2>Your order</h2><div className="checkout-summary-items">{items.map(({ product, quantity }) => <div key={product.id}><span className="checkout-item-image"><Image src={product.images[0]} alt="" fill sizes="54px" /><i>{quantity}</i></span><p><strong>{product.name}</strong><small>{money(product.price)} × {quantity}</small></p><strong>{money(product.price * quantity)}</strong></div>)}</div><div className="checkout-totals"><p><span>Subtotal</span><strong>{money(subtotal)}</strong></p><p><span>Delivery</span><strong>{form.location ? delivery.label : "Choose location"}</strong></p><div><span>Total now</span><strong>{money(total)}</strong></div>{delivery.fee == null && form.location && <small>Delivery arrangement is not included in this total.</small>}</div><button className="button button-primary button-large button-full" disabled={submitting || !hydrated}>{submitting ? <><i className="button-spinner" /> Securing order…</> : <>Place signed order <ChevronRight size={18} /></>}</button><div className="checkout-security"><LockKeyhole size={16} /> Final prices are calculated by the server from official product records.</div><div className="checkout-location"><MapPin size={16} /> {form.location || "Delivery location not selected"}</div></aside>
      </form>
    </div></section>
  );
}
