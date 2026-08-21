"use client";

import { useState } from "react";
import { Check, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { BUSINESS } from "@/lib/constants";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", contact: "", message: "" });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = encodeURIComponent(
      `Hello ${BUSINESS.name},\n\nName: ${form.name}\nContact: ${form.contact}\n\n${form.message}`,
    );
    window.open(`https://wa.me/${BUSINESS.whatsappLink}?text=${body}`, "_blank");
    setSent(true);
  };

  return (
    <>
      <section className="page-hero contact-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">Contact</span>
          <h1>Talk to the farm.</h1>
          <p>Questions about an order, a visit or an animal? We&apos;re here to help.</p>
        </div>
      </section>

      <section className="section">
        <div className="container contact-layout">
          <Reveal className="contact-details">
            <span className="eyebrow">Get in touch</span>
            <h2>We&apos;d love to hear from you.</h2>
            <p>
              Reach us on WhatsApp for the fastest response, or drop a message and we&apos;ll get
              back to you.
            </p>
            <div className="contact-cards">
              <a href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">
                <span>
                  <MessageCircle size={19} />
                </span>
                <div>
                  <small>WhatsApp</small>
                  <strong>{BUSINESS.whatsappDisplay}</strong>
                </div>
              </a>
              <a href={`tel:${BUSINESS.phoneLink}`}>
                <span>
                  <Phone size={19} />
                </span>
                <div>
                  <small>Phone</small>
                  <strong>{BUSINESS.phoneDisplay}</strong>
                </div>
              </a>
              <div>
                <span>
                  <MapPin size={19} />
                </span>
                <div>
                  <small>Location</small>
                  <strong>{BUSINESS.location}</strong>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="contact-form-card">
            {sent ? (
              <div className="form-success">
                <span>
                  <Check size={30} />
                </span>
                <h2>Message ready!</h2>
                <p>
                  We&apos;ve opened WhatsApp with your message. Just press send and we&apos;ll reply as
                  soon as we can.
                </p>
                <button className="button button-secondary" onClick={() => setSent(false)}>
                  Write another message
                </button>
              </div>
            ) : (
              <>
                <div className="form-card-head">
                  <span>
                    <Mail size={20} />
                  </span>
                  <div>
                    <h2>Send a message</h2>
                    <p>Opens WhatsApp so we can reply quickly.</p>
                  </div>
                </div>
                <form onSubmit={submit}>
                  <div className="auth-field-grid">
                    <label className="field">
                      <span>Your name</span>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </label>
                    <label className="field">
                      <span>Phone or email</span>
                      <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} required />
                    </label>
                  </div>
                  <label className="field" style={{ marginTop: 16 }}>
                    <span>Message</span>
                    <textarea rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
                  </label>
                  <button className="button button-whatsapp">
                    <Send size={17} /> Send via WhatsApp
                  </button>
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
              <div className="map-pattern">
                <MapPin size={34} />
              </div>
              <div>
                <h2>GG67+P95 Mahlabane</h2>
                <p>
                  Our farm sits in Mahlabane, Eswatini. Use the plus code in any maps app, or call
                  ahead for directions.
                </p>
                <a
                  className="button button-primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(BUSINESS.location)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in maps
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="contact-faq">
        <div className="container">
          <Reveal>
            <h2 style={{ fontSize: "2rem" }}>Quick answers</h2>
          </Reveal>
          <div className="faq-grid">
            {FAQ.map((item) => (
              <Reveal key={item.q}>
                <article>
                  <h3>{item.q}</h3>
                  <p>{item.a}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

const FAQ = [
  { q: "Do I have to pay online?", a: "No — you pay by cash, EFT or mobile money when you collect or receive your order." },
  { q: "Where do I collect my order?", a: "At the farm in Mahlabane. We'll confirm a collection time when we contact you." },
  { q: "Is delivery available?", a: "Yes, for a small fee (free above a set amount). We'll confirm the address when we call." },
  { q: "Can I visit before buying?", a: "Absolutely — call or WhatsApp ahead and we'll show you around." },
  { q: "How do I track my order?", a: "Use the order reference from your confirmation on the Track order page." },
  { q: "Can I order livestock?", a: "Yes — cattle, goats, sheep and poultry are listed in the shop when available." },
];
