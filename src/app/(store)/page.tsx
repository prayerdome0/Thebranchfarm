"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Beef,
  Egg,
  Leaf,
  MapPin,
  MessageCircle,
  Milk,
  PackageCheck,
  Phone,
  ShieldCheck,
  Sprout,
  Tractor,
  Truck,
  Play,
  Camera,
  Heart,
  ShoppingBag,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getProducts } from "@/lib/firebase/data";
import { BUSINESS } from "@/lib/constants";
import type { Product } from "@/types";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { formatMoney, freeDeliveryThreshold } = useStoreConfig();

  useEffect(() => {
    getProducts().then((list) => setProducts(list.slice(0, 12)));
  }, []);

  const featured = products.filter((p) => p.featured).slice(0, 4);
  const fallback = products.slice(0, 4);
  const picks = featured.length ? featured : fallback;

  const freshProducts = products.filter((p) => p.kind === "produce").slice(0, 3);
  const livestock = products.filter((p) => p.kind === "livestock").slice(0, 3);

  return (
    <>
      {/* 1. Hero */}
      <section className="home-hero">
        <div className="hero-image-stage">
          <Image
            src="/media/farm-hero.jpg"
            alt={`${BUSINESS.name} farm at Mahlabane, Eswatini`}
            fill
            priority
            sizes="100vw"
            className="hero-image"
          />
          <div className="hero-image-overlay" />
        </div>

        <div className="container hero-content">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span><Sprout size={16} /></span>
              {BUSINESS.name} · {BUSINESS.slogan}
            </span>
            <h1>
              The Branch Farm
              <br />
              <em>{BUSINESS.slogan}</em>
            </h1>
            <p>
              Fresh eggs, milk, vegetables and healthy livestock from our farm at Mahlabane. Raised with care, sold direct, traceable to the source.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/shop">
                Shop Now <ArrowRight size={18} />
              </Link>
              <a className="button button-whatsapp button-large" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> WhatsApp Us
              </a>
            </div>
            <div className="hero-trust">
              <span><BadgeCheck size={15} /> Farm-direct</span>
              <span><Truck size={15} /> {BUSINESS.deliveryFree}</span>
              <span><ShieldCheck size={15} /> Pay on collection/delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured products */}
      <section className="section products-section">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">From the farm</span>
                <h2>Featured products</h2>
                <p>Fresh, farm-direct produce and livestock ready to order.</p>
              </div>
              <div className="section-heading-action">
                <Link className="text-link" href="/shop">View the full shop <ArrowRight size={15} /></Link>
              </div>
            </div>
          </Reveal>
          <div className="product-grid home-product-grid" style={{ marginTop: 34 }}>
            {picks.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) * 80}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Why choose The Branch Farm */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <Reveal>
            <div className="section-heading section-heading-center">
              <div>
                <span className="eyebrow">Why choose us</span>
                <h2>Why choose The Branch Farm</h2>
                <p>We keep it simple: good food, healthy animals, honest records.</p>
              </div>
            </div>
          </Reveal>
          <div className="activity-grid">
            <article className="activity-card">
              <span className="activity-icon"><Leaf size={20} /></span>
              <h3>Raised with care</h3>
              <p>Pasture-raised livestock and naturally fed produce, managed daily.</p>
            </article>
            <article className="activity-card">
              <span className="activity-icon"><ShieldCheck size={20} /></span>
              <h3>Traceable</h3>
              <p>Every animal has its health and origin history recorded.</p>
            </article>
            <article className="activity-card">
              <span className="activity-icon"><PackageCheck size={20} /></span>
              <h3>Farm-direct</h3>
              <p>No middlemen. You order from us and collect or arrange delivery.</p>
            </article>
          </div>
        </div>
      </section>

      {/* 4. Our farm */}
      <section className="section story-section">
        <div className="container story-grid">
          <Reveal className="story-visual-reveal">
            <div className="motion-story">
              <div className="motion-shot">
                <Image src="/media/farm-sunset.jpg" alt="The Branch Farm at sunset" fill sizes="52vw" />
              </div>
              <div className="motion-vignette" />
              <div className="motion-title">
                <span><Tractor size={22} /></span>
                <p><small>{BUSINESS.location}</small><strong>The Branch Farm</strong></p>
              </div>
            </div>
          </Reveal>
          <Reveal className="story-copy" delay={120}>
            <span className="eyebrow">Our farm</span>
            <h2>A working farm at Mahlabane.</h2>
            <p>
              We farm at Mahlabane — cattle, goats, pigs, poultry, milk and vegetables. It is a working farm, not a shop shelf. What we sell comes from our own herd and land.
            </p>
            <ul className="feature-list">
              <li><span><Milk size={18} /></span><div><strong>Fresh milk & emasi</strong><p>Collected and chilled the same day.</p></div></li>
              <li><span><Egg size={18} /></span><div><strong>Free-range eggs</strong><p>Collected daily from our hens.</p></div></li>
              <li><span><Beef size={18} /></span><div><strong>Healthy livestock</strong><p>Cattle, goats, pigs and poultry raised on pasture.</p></div></li>
            </ul>
            <Link className="button button-secondary" href="/our-farm" style={{ marginTop: 8 }}>
              Explore our farm <ArrowRight size={17} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 5. Animals/farming */}
      <section className="section" style={{ background: "#f8faf7" }}>
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Livestock</span>
                <h2>Animals & farming</h2>
                <p>Cattle, goats, pigs and poultry — raised with care and recorded.</p>
              </div>
              <div className="section-heading-action">
                <Link className="text-link" href="/our-farm">Learn more <ArrowRight size={15} /></Link>
              </div>
            </div>
          </Reveal>
          <div className="product-grid" style={{ marginTop: 20 }}>
            {livestock.length ? livestock.map((p) => (
              <ProductCard key={p.id} product={p} />
            )) : (
              <>
                <div className="activity-card"><span className="activity-icon"><Beef size={20} /></span><h3>Cattle</h3><p>Beef and dairy cattle managed with health records.</p></div>
                <div className="activity-card"><span className="activity-icon"><Heart size={20} /></span><h3>Goats & Sheep</h3><p>Hardy breeds suited for Eswatini.</p></div>
                <div className="activity-card"><span className="activity-icon"><Egg size={20} /></span><h3>Poultry & Pigs</h3><p>Free-range chickens and pastured pigs.</p></div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 6. Fresh products */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Fresh produce</span>
                <h2>Fresh from the farm</h2>
                <p>Eggs, milk, emasi and vegetables — depending on season and availability.</p>
              </div>
              <Link className="text-link" href="/shop?kind=produce">Shop produce <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
          <div className="product-grid" style={{ marginTop: 20 }}>
            {freshProducts.length ? freshProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            )) : picks.slice(0,3).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* 7. Gallery preview */}
      <section className="section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">Gallery</span>
                <h2>Life at the farm</h2>
                <p>Photos from daily work — animals, produce and the land.</p>
              </div>
              <Link className="text-link" href="/gallery">View gallery <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
          <div className="gallery-grid" style={{ marginTop: 20 }}>
            {[
              { src: "/media/cattle.jpg", caption: "Our dairy herd", tag: "Livestock" },
              { src: "/media/eggs.jpg", caption: "Collected this morning", tag: "Produce" },
              { src: "/media/farm-sunset.jpg", caption: "End of the day", tag: "Farm" },
              { src: "/media/milk-bottles.jpg", caption: "Bottled at the farm", tag: "Dairy" },
              { src: "/media/goats-herd.jpg", caption: "Boer goats", tag: "Livestock" },
              { src: "/media/vegetable-garden.jpg", caption: "Vegetable garden", tag: "Produce" },
            ].map((img) => (
              <div key={img.src} className="gallery-item" style={{ position: "relative", height: 220 }}>
                <Image src={img.src} alt={img.caption} fill style={{ objectFit: "cover" }} sizes="30vw" />
                <span className="gallery-shade" />
                <span className="gallery-caption"><small>{img.tag}</small><strong>{img.caption}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Video preview */}
      <section className="section films-section">
        <div className="container">
          <Reveal>
            <div className="section-heading">
              <div>
                <span className="eyebrow">In motion</span>
                <h2>The farm on film</h2>
                <p>Short clips of daily life and farm work.</p>
              </div>
              <Link className="text-link" href="/gallery">Watch more <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <Link href="/gallery" className="video-banner" aria-label="Watch farm videos">
              <span className="video-banner-frame">
                <Image src="/media/farm-operations.jpg" alt="Farm operations" fill sizes="100vw" />
              </span>
              <span className="video-banner-play"><Play size={26} fill="currentColor" /></span>
              <span className="video-banner-copy">
                <small>{BUSINESS.slogan}</small>
                <strong>Watch life at {BUSINESS.name}</strong>
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 9. Delivery information */}
      <section className="section" style={{ background: "#fff" }}>
        <div className="container">
          <div className="promise-card" style={{ background: "var(--green-50)", color: "var(--ink)", border: "1px solid var(--line)" }}>
            <span className="promise-mark" style={{ background: "var(--green-800)", color: "#fff" }}><Truck size={26} /></span>
            <div>
              <span className="eyebrow" style={{ color: "var(--green-700)" }}>Delivery</span>
              <h2 style={{ color: "var(--green-950)" }}>{BUSINESS.deliveryFree}</h2>
              <p style={{ color: "var(--muted)" }}>{BUSINESS.deliveryOther} Free pickup at the farm. Delivery from {formatMoney(30)} — free over {formatMoney(freeDeliveryThreshold)}. Checkout collects your delivery location and we confirm when we call.</p>
            </div>
            <div className="promise-actions">
              <Link className="button button-primary" href="/shop">Shop now <ArrowRight size={17} /></Link>
              <span className="promise-phone" style={{ color: "var(--muted)" }}>Pickup free at Mahlabane</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. WhatsApp CTA */}
      <section className="section promise-section">
        <div className="container">
          <div className="promise-card">
            <span className="promise-mark"><MessageCircle size={26} /></span>
            <div>
              <span className="eyebrow">Order directly</span>
              <h2>Ready to order on WhatsApp?</h2>
              <p>Browse the shop, add to cart and checkout — or order straight on WhatsApp. Pay on collection or delivery.</p>
            </div>
            <div className="promise-actions">
              <a className="button button-whatsapp" href={`https://wa.me/${BUSINESS.whatsappLink}?text=${encodeURIComponent(`Hello ${BUSINESS.name}, I'd like to order from the farm.`)}`} target="_blank" rel="noreferrer">
                <MessageCircle size={18} /> WhatsApp Us
              </a>
              <Link className="button button-light" href="/shop">Shop Now <ShoppingBag size={17} /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Contact information */}
      <section className="section" style={{ background: "var(--cream)", paddingTop: 0 }}>
        <div className="container">
          <div className="location-card">
            <div>
              <span className="location-icon"><MapPin size={24} /></span>
              <h2>Find us at Mahlabane.</h2>
              <p>{BUSINESS.fullLocation || BUSINESS.location}. Call or WhatsApp ahead and we will show you around.</p>
              <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="button button-primary" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer"><MessageCircle size={17} /> WhatsApp</a>
                <a className="button button-secondary" href={`tel:${BUSINESS.phoneLink}`}><Phone size={17} /> Call</a>
                <Link className="button button-ghost" href="/contact">Contact page <ArrowRight size={15} /></Link>
              </div>
            </div>
            <div>
              <h3>Contact</h3>
              <p style={{ margin: "10px 0", fontSize: ".85rem" }}>
                <strong>Phone:</strong> {BUSINESS.phoneDisplay}<br />
                <strong>WhatsApp:</strong> {BUSINESS.whatsappDisplay}<br />
                <strong>Email:</strong> {BUSINESS.email}<br />
                <strong>Location:</strong> {BUSINESS.location}
              </p>
              <p style={{ fontSize: ".78rem", marginTop: 12 }}>
                Mon–Sat · 7:00–17:00<br />Sunday · by appointment
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
