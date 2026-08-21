"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, Mail, MapPin, MessageCircle, Navigation, Phone, Send } from "lucide-react";
import { useState } from "react";
import { BUSINESS } from "@/lib/constants";
import { sendContactMessage } from "@/lib/firebase/data";
import { contactSchema } from "@/lib/validation";
import { friendlyError, phoneHref, whatsappHref } from "@/lib/utils";

export default function ContactPage() {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({}); setState("loading");
    try {
      await sendContactMessage(parsed.data);
      setState("sent");
    } catch (error) {
      setErrorMessage(friendlyError(error)); setState("error");
    }
  };

  return (
    <>
      <section className="page-hero contact-hero"><div className="container page-hero-inner"><span className="eyebrow eyebrow-light">Contact us</span><h1>Let&apos;s talk farm-fresh.</h1><p>Ask about products, arrange another delivery location or get help with an existing order.</p></div></section>
      <section className="section contact-section"><div className="container contact-layout">
        <div className="contact-details"><span className="eyebrow">The Branch Farm</span><h2>Choose the channel that works for you.</h2><p>WhatsApp is convenient, but never required. You can call, send this form or continue through your online account.</p>
          <div className="contact-cards">
            <a href={phoneHref(BUSINESS.phoneLink)}><span><Phone size={21} /></span><div><small>Call us</small><strong>{BUSINESS.phoneDisplay}</strong></div><ArrowRight size={18} /></a>
            <a href={whatsappHref(BUSINESS.whatsappLink, "Hello The Branch Farm, I would like to make an enquiry.")} target="_blank" rel="noreferrer"><span><MessageCircle size={21} /></span><div><small>WhatsApp</small><strong>{BUSINESS.whatsappDisplay}</strong></div><ArrowRight size={18} /></a>
            <div><span><MapPin size={21} /></span><div><small>Farm location</small><strong>{BUSINESS.location}</strong></div></div>
            <div><span><Clock3 size={21} /></span><div><small>Delivery</small><strong>Free around Manzini &amp; Matsapha</strong></div></div>
          </div>
        </div>
        <div className="contact-form-card">
          {state === "sent" ? <div className="form-success"><span><CheckCircle2 size={30} /></span><h2>Message received</h2><p>Thank you, {form.fullName.split(" ")[0]}. Our team will use the contact details you provided to respond.</p><button className="button button-secondary" onClick={() => { setForm({ fullName: "", phone: "", email: "", message: "" }); setState("idle"); }}>Send another message</button></div> : <form onSubmit={submit} noValidate><div className="form-card-head"><span><Mail size={21} /></span><div><h2>Send an enquiry</h2><p>We&apos;ll get back to you as soon as we can.</p></div></div>
            <div className="form-grid"><label className="field field-full"><span>Full name *</span><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />{errors.fullName && <small className="field-error">{errors.fullName}</small>}</label><label className="field"><span>Phone *</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" autoComplete="tel" />{errors.phone && <small className="field-error">{errors.phone}</small>}</label><label className="field"><span>Email <em>optional</em></span><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" autoComplete="email" />{errors.email && <small className="field-error">{errors.email}</small>}</label><label className="field field-full"><span>How can we help? *</span><textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />{errors.message && <small className="field-error">{errors.message}</small>}</label></div>
            {state === "error" && <div className="form-alert error">{errorMessage}</div>}
            <button className="button button-primary button-large button-full" disabled={state === "loading"}>{state === "loading" ? <><i className="button-spinner" /> Sending…</> : <>Send message <Send size={18} /></>}</button>
          </form>}
        </div>
      </div></section>
      <section className="section map-section"><div className="container"><div className="map-card"><div className="map-pattern"><MapPin size={36} /></div><div><span className="eyebrow">Location reference</span><h2>GG67+P95 Mahlabane, Eswatini</h2><p>We have not invented a street address. Use the official location reference above, or contact us before travelling.</p><a className="button button-secondary" href="https://www.google.com/maps/search/?api=1&query=GG67%2BP95%20Mahlabane%2C%20Eswatini" target="_blank" rel="noreferrer"><Navigation size={18} /> Open in Maps</a></div></div></div></section>
      <section className="contact-faq"><div className="container"><h2>Quick answers</h2><div className="faq-grid"><article><h3>Where is milk available?</h3><p>Our current milk availability reference is Ngculwini.</p></article><article><h3>Do I need WhatsApp?</h3><p>No. Place and track orders normally, or call us directly.</p></article><article><h3>Can you deliver elsewhere?</h3><p>Yes, other locations can be arranged. We do not add an invented delivery fee.</p></article></div><Link href="/shop" className="text-link">Ready to order? Visit the shop <ArrowRight size={17} /></Link></div></section>
    </>
  );
}
