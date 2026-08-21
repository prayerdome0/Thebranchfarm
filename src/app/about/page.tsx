import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, HeartHandshake, Leaf, MapPin, Milk, Sprout, TrendingUp } from "lucide-react";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = { title: "Our Farm", description: "Meet The Branch Farm in Mahlabane, Eswatini." };

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <Image src="/media/farm-sunset.jpg" alt="The Branch Farm at sunset" fill priority sizes="100vw" />
        <div className="about-hero-overlay" />
        <div className="container about-hero-content"><span className="eyebrow eyebrow-light">Our farm</span><h1>Growing with purpose.<br />Serving with care.</h1><p>The Branch Farm is a young Eswatini agricultural business connecting honest production with modern, convenient service.</p></div>
      </section>

      <section className="section about-intro-section">
        <div className="container about-intro-grid">
          <div><span className="eyebrow">The Branch Farm story</span><h2>Rooted here. Built for what comes next.</h2></div>
          <div><p>Established in 2026, The Branch Farm is building an agricultural operation around dairy, livestock and disciplined farm management. Our first active range is fresh milk and traditional sour milk, currently available from Ngculwini.</p><p>We are preparing future beef, egg, pork and chicken ranges — but we will never advertise them as available until they truly are. That honest approach sits at the centre of our relationship with every customer.</p></div>
        </div>
      </section>

      <section className="section values-section">
        <div className="container values-layout">
          <div className="values-image-stack">
            <div className="values-image-main"><Image src="/media/cattle.jpg" alt="Nguni cattle grazing" fill sizes="(max-width: 900px) 100vw, 50vw" /></div>
            <div className="values-fact"><strong>2026</strong><span>Our story begins in Eswatini</span></div>
          </div>
          <div className="values-copy"><span className="eyebrow">What guides us</span><h2>A farm should earn trust every day.</h2><div className="values-list">
            <article><span><BadgeCheck size={21} /></span><div><h3>Quality with honesty</h3><p>Clear product status, transparent pricing and no invented claims.</p></div></article>
            <article><span><ClipboardList size={21} /></span><div><h3>Traceable operations</h3><p>Connected records for animals, production, inventory and sales.</p></div></article>
            <article><span><HeartHandshake size={21} /></span><div><h3>Service made human</h3><p>Order online, call, email or use WhatsApp — whichever works for you.</p></div></article>
            <article><span><Leaf size={21} /></span><div><h3>Responsible growth</h3><p>Launch each new farm line when the operation is genuinely ready.</p></div></article>
          </div></div>
        </div>
      </section>

      <section className="section roadmap-section">
        <div className="container"><div className="roadmap-heading"><span className="eyebrow">Our direction</span><h2>From dairy today to a connected farm tomorrow.</h2></div><div className="roadmap">
          <article className="roadmap-active"><span><Milk size={22} /></span><small>Now</small><h3>Fresh dairy</h3><p>Raw full-fat milk and traditional sour milk available.</p></article>
          <article><span><Sprout size={22} /></span><small>Growing</small><h3>Farm production</h3><p>Livestock, eggs, poultry, pork and beef operations.</p></article>
          <article><span><TrendingUp size={22} /></span><small>Future</small><h3>Local market reach</h3><p>More products, delivery options and customer services.</p></article>
        </div></div>
      </section>

      <section className="section location-section"><div className="container location-card"><div><span className="location-icon"><MapPin size={24} /></span><span className="eyebrow">Find us</span><h2>Mahlabane, Eswatini</h2><p>{BUSINESS.location}</p><p>Milk availability reference: <strong>{BUSINESS.milkLocation}</strong></p></div><div><h3>Ready to order?</h3><p>Free delivery currently applies around Manzini and Matsapha. Other locations can be arranged.</p><Link href="/shop" className="button button-primary">Visit the shop <ArrowRight size={18} /></Link></div></div></section>
    </>
  );
}
