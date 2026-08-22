"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Leaf, MapPin, ShieldCheck, Sprout, MessageCircle, Phone } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { BUSINESS } from "@/lib/constants";

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <Image src="/media/farm-sunset.jpg" alt={`${BUSINESS.name} at sunset`} fill priority sizes="100vw" />
        <div className="about-hero-overlay" />
        <div className="container about-hero-content">
          <span className="eyebrow eyebrow-light">{BUSINESS.name} · {BUSINESS.slogan}</span>
          <h1>The Branch Farm</h1>
          <p>{BUSINESS.slogan} — fresh farm produce and livestock from Mahlabane, Eswatini.</p>
        </div>
      </section>

      <section className="section about-intro-section">
        <div className="container about-intro-grid">
          <Reveal>
            <div>
              <span className="eyebrow">About</span>
              <h2>Honest food, from our farm to you.</h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <p>We farm at Mahlabane — cattle, goats, pigs, poultry, milk and vegetables. Everything we sell comes from our own operation.</p>
              <p>We keep careful records for every animal — health, treatments, origin — so you know what you are buying. No middlemen, no mystery.</p>
              <p>Order online, collect at the farm or arrange delivery. {BUSINESS.deliveryFree} {BUSINESS.deliveryOther}</p>
              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link className="button button-primary" href="/shop">Shop Now <ArrowRight size={17} /></Link>
                <a className="button button-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Us</a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section values-section">
        <div className="container values-layout">
          <Reveal className="values-image-stack">
            <div className="values-image-main">
              <Image src="/media/cattle.jpg" alt="Cattle at The Branch Farm" fill sizes="50vw" style={{ objectFit: "cover" }} />
            </div>
          </Reveal>
          <Reveal className="values-copy" delay={120}>
            <span className="eyebrow">What we stand for</span>
            <h2>What we stand for.</h2>
            <div className="values-list">
              <article><span><Heart size={19} /></span><div><h3>Care for animals</h3><p>Pasture-raised, naturally fed, health checked and recorded.</p></div></article>
              <article><span><ShieldCheck size={19} /></span><div><h3>Traceable</h3><p>Every animal and batch logged back to source.</p></div></article>
              <article><span><Sprout size={19} /></span><div><h3>Direct sales</h3><p>No middlemen — buy straight from farm.</p></div></article>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="location-card">
            <div>
              <span className="location-icon"><MapPin size={24} /></span>
              <h2>{BUSINESS.name} · {BUSINESS.slogan}</h2>
              <p>{BUSINESS.fullLocation}. Call or WhatsApp ahead and we will show you around.</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="button button-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Us</a>
                <a className="button button-secondary" href={`tel:${BUSINESS.phoneLink}`}><Phone size={17} /> Call Us</a>
                <Link className="button button-primary" href="/contact">Contact <ArrowRight size={17} /></Link>
              </div>
            </div>
            <div>
              <h3>Delivery</h3>
              <p style={{ margin: "10px 0 20px", fontSize: ".85rem" }}>{BUSINESS.deliveryFree}<br />{BUSINESS.deliveryOther}</p>
              <p style={{ fontSize: ".78rem" }}>Phone {BUSINESS.phoneDisplay}<br />WhatsApp {BUSINESS.whatsappDisplay}<br />{BUSINESS.email}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
