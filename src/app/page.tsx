"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Beef,
  Bird,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Egg,
  Leaf,
  MapPin,
  Milk,
  PackageCheck,
  Phone,
  PiggyBank,
  Play,
  ShieldCheck,
  Sparkles,
  Sprout,
  Truck,
  Volume2,
} from "lucide-react";
import { useProducts } from "@/contexts/ProductContext";
import { useSound } from "@/contexts/SoundContext";
import { useBusinessSettings } from "@/contexts/BusinessSettingsContext";
import { FarmVideoCard } from "@/components/media/FarmVideoCard";
import { ProductCard } from "@/components/products/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BUSINESS, FARM_VIDEOS } from "@/lib/constants";
import { phoneHref, whatsappHref } from "@/lib/utils";

const activities = [
  { icon: Milk, title: "Dairy", copy: "Fresh raw full-fat milk and traditional sour milk.", status: "Available" },
  { icon: Beef, title: "Beef", copy: "Responsible cattle and future quality beef production.", status: "Coming soon" },
  { icon: Egg, title: "Eggs", copy: "A growing egg-production operation for the local market.", status: "Coming soon" },
  { icon: Bird, title: "Chicken", copy: "Poultry production is being prepared for a future launch.", status: "Coming soon" },
  { icon: PiggyBank, title: "Pork", copy: "A carefully managed piggery and future pork range.", status: "Coming soon" },
  { icon: ClipboardCheck, title: "Farm management", copy: "Traceable livestock, production and inventory records.", status: "In operation" },
];

export default function HomePage() {
  const { products } = useProducts();
  const { enabled, toggleSound } = useSound();
  const settings = useBusinessSettings();
  const featured = products.filter((product) => product.featured).slice(0, 4);

  return (
    <>
      <section className="home-hero">
        <div className="hero-image-stage">
          <Image src="/media/farm-hero.jpg" alt="Illustrated green farm landscape at sunrise" fill priority sizes="100vw" className="hero-image" />
          <div className="hero-image-overlay" />
          <div className="hero-orbit hero-orbit-one" />
          <div className="hero-orbit hero-orbit-two" />
        </div>
        <div className="container hero-content">
          <div className="hero-copy">
            <div className="hero-kicker"><span><Sprout size={16} /></span> Eswatini grown · Established 2026</div>
            <h1>{settings.heroHeadline.split(".")[0] || "Fresh from our farm"}.<br /><em>{settings.heroHeadline.split(".").slice(1).join(".").trim() || "Straight to you."}</em></h1>
            <p>The Branch Farm brings fresh dairy closer with simple ordering, thoughtful service and delivery around Manzini and Matsapha.</p>
            <div className="hero-actions">
              <Link href="/shop" className="button button-primary button-large">Shop products <ArrowRight size={19} /></Link>
              <Link href="/track-order" className="button button-glass button-large"><PackageCheck size={19} /> Track an order</Link>
            </div>
            <div className="hero-trust">
              <span><Check size={15} /> Raw full-fat milk</span>
              <span><Check size={15} /> Local delivery</span>
              <span><Check size={15} /> Direct support</span>
            </div>
          </div>
          <div className="hero-float-card">
            <div className="hero-card-top"><span className="pulse-icon"><Milk size={21} /></span><span><small>Now pouring</small><strong>Fresh Milk</strong></span></div>
            <div className="hero-price"><strong>E16</strong><span>/ litre</span></div>
            <p>Available in Ngculwini</p>
            <Link href="/shop/raw-fresh-full-fat-milk">Order fresh milk <ChevronRight size={17} /></Link>
          </div>
          <button className="hero-sound" onClick={toggleSound} aria-pressed={enabled}>
            <span><Volume2 size={18} /></span>
            <span><small>{enabled ? "Playing softly" : "Sound off"}</small><strong>{enabled ? "Farm ambience" : "Hear the farm"}</strong></span>
          </button>
        </div>
        <div className="hero-scroll-cue"><span /> Scroll to explore</div>
      </section>

      <section className="service-ribbon">
        <div className="container service-ribbon-grid">
          <div><span><Truck size={21} /></span><p><strong>Free delivery</strong><small>Manzini &amp; Matsapha</small></p></div>
          <div><span><MapPin size={21} /></span><p><strong>Milk in Ngculwini</strong><small>Order or arrange collection</small></p></div>
          <div><span><Clock3 size={21} /></span><p><strong>Other locations</strong><small>Delivery can be arranged</small></p></div>
          <div><span><Phone size={21} /></span><p><strong>Talk to our team</strong><small>{BUSINESS.phoneDisplay}</small></p></div>
        </div>
      </section>

      <section className="section products-section">
        <div className="container">
          <SectionHeading
            eyebrow="From the farm"
            title="Good food starts close to home."
            description="Our active dairy range is ready to order. Everything else stays clearly marked until it is genuinely available."
            action={<Link href="/shop" className="text-link">View all products <ArrowRight size={17} /></Link>}
          />
          <div className="product-grid home-product-grid">
            {featured.map((product, index) => <ProductCard product={product} key={product.id} priority={index < 3} />)}
          </div>
        </div>
      </section>

      <section className="section story-section">
        <div className="container story-grid">
          <div className="motion-story" aria-label="Cattle grazing on the farm">
            <div className="motion-shot motion-shot-one"><Image src="/media/cattle.jpg" alt="Cattle grazing" fill sizes="(max-width: 900px) 100vw, 55vw" /></div>
            <video className="motion-video" autoPlay muted loop playsInline preload="metadata" poster="/media/cattle.jpg" aria-label="Cattle grazing in a green field">
              <source src="https://videos.pexels.com/video-files/855340/855340-hd_1920_1080_25fps.mp4" type="video/mp4" />
            </video>
            <div className="motion-vignette" />
            <div className="motion-title"><span><Play size={16} fill="currentColor" /></span><p><small>Farm film</small><strong>Rooted in care</strong></p></div>
            <div className="motion-progress"><i /><i /><i /></div>
          </div>
          <div className="story-copy">
            <span className="eyebrow">Our approach</span>
            <h2>A modern farm with grounded values.</h2>
            <p>We are building The Branch Farm around quality production, clear records and honest availability. Customers get a simple way to order; our team gets connected tools to run the farm responsibly.</p>
            <ul className="feature-list">
              <li><span><BadgeCheck size={19} /></span><div><strong>Honest availability</strong><p>Only products marked available can be purchased.</p></div></li>
              <li><span><ShieldCheck size={19} /></span><div><strong>Clear records</strong><p>Orders and official documents stay connected and traceable.</p></div></li>
              <li><span><Leaf size={19} /></span><div><strong>Built for growth</strong><p>Dairy today, with more farm products to follow.</p></div></li>
            </ul>
            <Link href="/about" className="button button-secondary">Discover our farm <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      <section className="section films-section">
        <div className="container">
          <SectionHeading
            eyebrow="More to watch"
            title="A growing farm story, in motion."
            description="Watch more films about the dairy, livestock and future product lines we are building toward."
            action={<Link href="/videos" className="text-link">Watch all films <ArrowRight size={17} /></Link>}
          />
          <div className="farm-video-grid farm-video-grid-preview">
            {FARM_VIDEOS.slice(1, 4).map((video) => <FarmVideoCard key={video.id} video={video} />)}
          </div>
        </div>
      </section>

      <section className="section activities-section">
        <div className="container">
          <SectionHeading eyebrow="What we do" title="One connected agricultural business." description="Production, livestock and customer service work together — with each new product launched only when the farm is ready." align="center" />
          <div className="activity-grid">
            {activities.map((activity) => {
              const Icon = activity.icon;
              const available = activity.status !== "Coming soon";
              return (
                <article key={activity.title} className="activity-card">
                  <span className="activity-icon"><Icon size={25} /></span>
                  <span className={available ? "activity-status active" : "activity-status"}>{activity.status}</span>
                  <h3>{activity.title}</h3>
                  <p>{activity.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section promise-section">
        <div className="container promise-card">
          <div className="promise-mark"><Sparkles size={25} /></div>
          <div><span className="eyebrow">Nayi Plug</span><h2>Your fresh dairy plug, close to home.</h2><p>Order online, continue on WhatsApp if you prefer, or call us directly. WhatsApp is always optional.</p></div>
          <div className="promise-actions">
            <Link href="/shop" className="button button-light">Order now <ArrowRight size={18} /></Link>
            <a href={whatsappHref(BUSINESS.whatsappLink, "Hello The Branch Farm, I would like to ask about your available dairy products.")} target="_blank" rel="noreferrer" className="button button-outline-light">WhatsApp us</a>
            <a href={phoneHref(BUSINESS.phoneLink)} className="promise-phone">or call {BUSINESS.phoneDisplay}</a>
          </div>
        </div>
      </section>
    </>
  );
}
