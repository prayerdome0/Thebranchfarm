"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Beef, Egg, Heart, Leaf, MapPin, MessageCircle, Milk, ShieldCheck, Tractor, Truck } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { BUSINESS } from "@/lib/constants";

export default function OurFarmPage() {
  return (
    <>
      <section className="page-hero" style={{ background: `linear-gradient(110deg, rgba(10,42,27,.9), rgba(22,67,43,.7)), url('/media/farm-hero.jpg') center/cover`, minHeight: 420 }}>
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">{BUSINESS.name} · {BUSINESS.slogan}</span>
          <h1>Our Farm</h1>
          <p>A working farm at Mahlabane — livestock, fresh produce and daily work shared directly with you.</p>
        </div>
      </section>

      <section className="section about-intro-section">
        <div className="container about-intro-grid">
          <Reveal>
            <div>
              <span className="eyebrow">Introduction</span>
              <h2>The Branch Farm at Mahlabane.</h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <p>
                We are a family farm in Mahlabane, Eswatini. We raise cattle, goats, pigs, poultry and grow vegetables and dairy. Everything we sell comes from our own operation.
              </p>
              <p>
                We keep records for every animal — health, treatments, origin — so you know what you are buying. No middlemen, no mystery. Order online, collect at the farm or arrange delivery.
              </p>
              <p>
                {BUSINESS.deliveryFree} {BUSINESS.deliveryOther}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section values-section">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Animals</span>
                <h2>What we raise</h2>
                <p>Healthy livestock raised on pasture with daily care.</p>
              </div>
            </div>
          </Reveal>
          <div className="activity-grid">
            <article className="activity-card"><span className="activity-icon"><Beef size={20} /></span><h3>Cattle</h3><p>Beef and dairy herd, recorded and traceable.</p></article>
            <article className="activity-card"><span className="activity-icon"><Heart size={20} /></span><h3>Goats</h3><p>Boer goats, hardy and well managed.</p></article>
            <article className="activity-card"><span className="activity-icon"><Egg size={20} /></span><h3>Pigs & Poultry</h3><p>Pastured pigs and free-range chickens.</p></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Products</span>
                <h2>Fresh products</h2>
                <p>Milk, emasi, eggs and seasonal vegetables.</p>
              </div>
              <Link href="/shop" className="text-link">Shop now <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
          <div className="gallery-grid" style={{ marginTop: 24 }}>
            {[
              { src: "/media/raw-milk.jpg", label: "Fresh milk" },
              { src: "/media/emasi-jars.jpg", label: "Emasi - Latsambile & Lashubile" },
              { src: "/media/eggs.jpg", label: "Free-range eggs" },
              { src: "/media/vegetable-garden.jpg", label: "Vegetables" },
              { src: "/media/milking-parlour.jpg", label: "Milking parlour" },
              { src: "/media/milk-bottles.jpg", label: "Bottled at the farm" },
            ].map((img) => (
              <div key={img.src} className="gallery-item" style={{ position: "relative", height: 200 }}>
                <Image src={img.src} alt={img.label} fill style={{ objectFit: "cover" }} sizes="30vw" />
                <span className="gallery-shade" />
                <span className="gallery-caption"><strong>{img.label}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container story-grid">
          <Reveal>
            <div className="motion-story" style={{ height: 520 }}>
              <div className="motion-shot"><Image src="/media/farm-operations.jpg" alt="Farm operations" fill sizes="50vw" style={{ objectFit: "cover" }} /></div>
              <div className="motion-vignette" />
              <div className="motion-title"><span><Tractor size={22} /></span><p><small>{BUSINESS.location}</small><strong>Daily activities</strong></p></div>
            </div>
          </Reveal>
          <Reveal delay={100} className="story-copy">
            <span className="eyebrow">Farm activities</span>
            <h2>Daily work, done properly.</h2>
            <ul className="feature-list">
              <li><span><Milk size={18} /></span><div><strong>Milking</strong><p>Early morning milking, chilling and bottling.</p></div></li>
              <li><span><Egg size={18} /></span><div><strong>Egg collection</strong><p>Collected daily from free-range hens.</p></div></li>
              <li><span><Leaf size={18} /></span><div><strong>Feeding & grazing</strong><p>Pasture management and feeding routines.</p></div></li>
              <li><span><ShieldCheck size={18} /></span><div><strong>Health checks</strong><p>Regular inspection and recorded treatments.</p></div></li>
            </ul>
            <Link className="button button-secondary" href="/gallery">View gallery <ArrowRight size={17} /></Link>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="location-card">
            <div>
              <span className="location-icon"><MapPin size={24} /></span>
              <h2>Visit or order</h2>
              <p>{BUSINESS.fullLocation}. We welcome visitors — call or WhatsApp ahead.</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="button button-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp Us</a>
                <Link className="button button-primary" href="/shop">Shop Now <ArrowRight size={17} /></Link>
                <Link className="button button-secondary" href="/contact">Contact <ArrowRight size={17} /></Link>
              </div>
            </div>
            <div>
              <h3>Delivery</h3>
              <p style={{ margin: "10px 0", fontSize: ".9rem" }}><Truck size={16} style={{ display: "inline", marginRight: 6 }} />{BUSINESS.deliveryFree}</p>
              <p style={{ fontSize: ".85rem" }}>{BUSINESS.deliveryOther}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
