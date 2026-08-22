"use client";

import { useState } from "react";
import { Check, Mail, MapPin, MessageCircle, Phone, Send, Truck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { BUSINESS } from "@/lib/constants";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = encodeURIComponent(`Hello ${BUSINESS.name} - ${BUSINESS.slogan},\n\nName: ${form.name}\nContact: ${form.contact}\n\n${form.message}\n\nDelivery location: `);
    window.open(`https://wa.me/${BUSINESS.whatsappLink}?text=${body}`, "_blank");
    setSent(true);
  };

  return (
    <>
      <section className="page-hero contact-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">Contact · {BUSINESS.name}</span>
          <h1>Contact us</h1>
          <p>Phone, WhatsApp, location, email. {BUSINESS.deliveryFree}</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-layout">
          <Reveal className="contact-details">
            <span className="eyebrow">{BUSINESS.name} · {BUSINESS.slogan}</span>
            <h2>Talk to the farm.</h2>
            <p>Reach us on WhatsApp for fastest response. {BUSINESS.deliveryOther}</p>
            <div className="contact-cards">
              <a href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">
                <span><MessageCircle size={19} /></span>
                <div><small>WhatsApp</small><strong>{BUSINESS.whatsappDisplay}</strong></div>
              </a>
              <a href={`tel:${BUSINESS.phoneLink}`}>
                <span><Phone size={19} /></span>
                <div><small>Phone</small><strong>{BUSINESS.phoneDisplay}</strong></div>
              </a>
              <div>
                <span><MapPin size={19} /></span>
                <div><small>Location</small><strong>{BUSINESS.fullLocation || BUSINESS.location}</strong></div>
              </div>
              <div>
                <span><Mail size={19} /></span>
                <div><small>Email</small><strong>{BUSINESS.email}</strong></div>
              </div>
              <div>
                <span><Truck size={19} /></span>
                <div><small>Delivery</small><strong>{BUSINESS.deliveryFree}</strong><small>{BUSINESS.deliveryOther}</small></div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="button button-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Us</a>
              <a className="button button-primary" href={`tel:${BUSINESS.phoneLink}`}><Phone size={17} /> Call Us</a>
            </div>
          </Reveal>

          <Reveal delay={100} className="contact-form-card">
            {sent ? (
              <div className="form-success">
                <span><Check size={30} /></span>
                <h2>Message ready!</h2>
                <p>We opened WhatsApp with your message. Just press send.</p>
                <button className="button button-secondary" onClick={() => setSent(false)}>Write another</button>
              </div>
            ) : (
              <>
                <div className="form-card-head">
                  <span><Mail size={20} /></span>
                  <div><h2>Send a message</h2><p>Opens WhatsApp so we can reply quickly.</p></div>
                </div>
                <form onSubmit={submit}>
                  <div className="auth-field-grid">
                    <label className="field"><span>Your name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
                    <label className="field"><span>Phone or email</span><input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required /></label>
                  </div>
                  <label className="field" style={{ marginTop: 16 }}><span>Message</span><textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required placeholder="Hello, I'd like to order… Delivery location…" /></label>
                  <button className="button button-whatsapp"><Send size={17} /> Send via WhatsApp</button>
                </form>
              </>
            )}
          </Reveal>
        </div>
      </section>

      <section className="section map-section">
        <div className="container">
          <Reveal>
            <div className="map-card">
              <div className="map-pattern"><MapPin size={34} /></div>
              <div>
                <h2>{BUSINESS.fullLocation || BUSINESS.location}</h2>
                <p>Our farm sits in Mahlabane, Eswatini. {BUSINESS.deliveryFree} {BUSINESS.deliveryOther}</p>
                <a className="button button-primary" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSINESS.fullLocation || BUSINESS.location)}`} target="_blank" rel="noreferrer">Open in maps</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
