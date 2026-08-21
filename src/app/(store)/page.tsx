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
  Milk,
  PackageCheck,
  ShieldCheck,
  Sprout,
  Tractor,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { getProducts } from "@/lib/firebase/data";
import { BUSINESS } from "@/lib/constants";
import { money } from "@/lib/utils";
import type { Product } from "@/types";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts().then((list) => setProducts(list.slice(0, 4)));
  }, []);

  const featured = products.length ? products : [];
  const heroProduct = featured[0];

  return (
    <>
      <section className="home-hero">
        <div className="hero-image-stage">
          <Image
            src="/media/farm-hero.jpg"
            alt="The Branch Farm at Mahlabane"
            fill
            priority
            sizes="100vw"
            className="hero-image"
          />
          <div className="hero-image-overlay" />
        </div>
        <i className="hero-orbit hero-orbit-one" aria-hidden="true" />
        <i className="hero-orbit hero-orbit-two" aria-hidden="true" />

        <div className="container hero-content">
          <div className="hero-copy">
            <span className="hero-kicker">
              <span>
                <Sprout size={16} />
              </span>
              {BUSINESS.name} · {BUSINESS.slogan}
            </span>
            <h1>
              From our farm,
              <br />
              <em>to your table.</em>
            </h1>
            <p>
              Fresh eggs, raw milk, vegetables and healthy livestock — raised at Mahlabane and
              ordered straight from the farm. Traceable, honest and delivered with care.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary button-large" href="/shop">
                Shop the farm <ArrowRight size={18} />
              </Link>
              <Link className="button button-glass button-large" href="/track">
                Track an order
              </Link>
            </div>
            <div className="hero-trust">
              <span>
                <BadgeCheck size={15} /> Farm-direct
              </span>
              <span>
                <Truck size={15} /> Free delivery over {money(500)}
              </span>
              <span>
                <ShieldCheck size={15} /> Order without paying online
              </span>
            </div>
          </div>

          {heroProduct && (
            <div className="hero-float-card">
              <div className="hero-card-top">
                <span className="pulse-icon">
                  <Leaf size={20} />
                </span>
                <span>
                  <small>Featured</small>
                  <strong>{heroProduct.name}</strong>
                </span>
              </div>
              <div className="hero-price">
                <strong>{heroProduct.price.toLocaleString()}</strong>
                <span>/ {heroProduct.unit}</span>
              </div>
              <p>Fresh from the farm, ready to order.</p>
              <Link href={`/shop/${heroProduct.id}`}>
                Order now <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="service-ribbon">
        <div className="container service-ribbon-grid">
          <div>
            <span>
              <Egg size={20} />
            </span>
            <p>
              <strong>Fresh produce</strong>
              <small>Eggs, milk &amp; vegetables daily</small>
            </p>
          </div>
          <div>
            <span>
              <Beef size={20} />
            </span>
            <p>
              <strong>Healthy livestock</strong>
              <small>Cattle, goats &amp; poultry</small>
            </p>
          </div>
          <div>
            <span>
              <PackageCheck size={20} />
            </span>
            <p>
              <strong>Traceable records</strong>
              <small>Every animal &amp; batch logged</small>
            </p>
          </div>
          <div>
            <span>
              <Truck size={20} />
            </span>
            <p>
              <strong>Pickup or delivery</strong>
              <small>Collect free or have it delivered</small>
            </p>
          </div>
        </div>
      </section>

      <section className="section products-section">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">From the farm</span>
              <h2>This week&apos;s picks</h2>
              <p>Fresh, farm-direct produce and livestock ready to order.</p>
            </div>
            <div className="section-heading-action">
              <Link className="text-link" href="/shop">
                View the full shop <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="product-grid home-product-grid" style={{ marginTop: 34 }}>
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="section story-section">
        <div className="container story-grid">
          <div className="motion-story">
            <div className="motion-shot">
              <Image src="/media/farm-sunset.jpg" alt="The Branch Farm at sunset" fill sizes="52vw" />
            </div>
            <div className="motion-shot motion-shot-two">
              <Image src="/media/cattle.jpg" alt="Cattle at The Branch Farm" fill sizes="52vw" />
            </div>
            <div className="motion-vignette" />
            <div className="motion-title">
              <span>
                <Tractor size={22} />
              </span>
              <p>
                <small>{BUSINESS.location}</small>
                <strong>The Branch Farm</strong>
              </p>
            </div>
          </div>

          <div className="story-copy">
            <span className="eyebrow">Our story</span>
            <h2>A working farm, shared directly with you.</h2>
            <p>
              We keep careful records of every animal, every batch and every treatment — so what
              reaches your table is honest, healthy and fully traceable. No middlemen, no mystery.
            </p>
            <ul className="feature-list">
              <li>
                <span>
                  <Leaf size={18} />
                </span>
                <div>
                  <strong>Raised with care</strong>
                  <p>Pasture-raised livestock and naturally fed produce.</p>
                </div>
              </li>
              <li>
                <span>
                  <Milk size={18} />
                </span>
                <div>
                  <strong>Collected fresh</strong>
                  <p>Eggs and milk gathered and chilled the same day.</p>
                </div>
              </li>
              <li>
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Fully traceable</strong>
                  <p>Health and activity records for every animal.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section promise-section">
        <div className="container">
          <div className="promise-card">
            <span className="promise-mark">
              <MessageCircleIcon />
            </span>
            <div>
              <span className="eyebrow">Order directly</span>
              <h2>Ready to shop the farm?</h2>
              <p>
                Browse the shop, add to your cart and place an order — pay on collection or
                delivery by cash, EFT or mobile money.
              </p>
            </div>
            <div className="promise-actions">
              <Link className="button button-light" href="/shop">
                Shop now <ArrowRight size={17} />
              </Link>
              <span className="promise-phone">
                or WhatsApp {BUSINESS.whatsappDisplay}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MessageCircleIcon() {
  return (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
