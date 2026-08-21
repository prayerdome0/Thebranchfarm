"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Heart, Leaf, MapPin, ShieldCheck, Sprout } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { BUSINESS } from "@/lib/constants";

export default function AboutPage() {
  return (
    <>
      <section className="about-hero">
        <Image src="/media/farm-sunset.jpg" alt="The Branch Farm at sunset" fill priority sizes="100vw" />
        <div className="about-hero-overlay" />
        <div className="container about-hero-content">
          <span className="eyebrow eyebrow-light">About us</span>
          <h1>A family farm, run with records.</h1>
          <p>
            The Branch Farm grows healthy livestock and fresh produce at Mahlabane — and keeps a
            careful, traceable history of everything we raise.
          </p>
          <small className="visual-disclosure">Photography from the farm at Mahlabane, Eswatini.</small>
        </div>
      </section>

      <section className="section about-intro-section">
        <div className="container about-intro-grid">
          <Reveal>
            <div>
              <span className="eyebrow">Who we are</span>
              <h2>Honest food, from soil and herd to your table.</h2>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div>
              <p>
                We are a working farm, not a reseller. Every egg, litre of milk and animal we offer
                comes from our own operation, raised with care and documented from day one.
              </p>
              <p>
                What sets us apart is the record behind the product — each animal carries its full
                health and activity history, so you always know exactly what you are buying.
              </p>
              <p>
                Order online, collect at the farm or arrange delivery, and pay by cash, EFT or
                mobile money when you receive it. Simple, honest and direct.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section values-section">
        <div className="container values-layout">
          <Reveal className="values-image-stack">
            <div className="values-image-main">
              <Image src="/media/cattle.jpg" alt="Cattle at The Branch Farm" fill sizes="50vw" />
            </div>
            <div className="values-fact">
              <strong>{new Date().getFullYear() - BUSINESS.established + 1}</strong>
              <span>years of careful farming</span>
            </div>
          </Reveal>
          <Reveal className="values-copy" delay={120}>
            <span className="eyebrow">Our values</span>
            <h2>What we stand for.</h2>
            <div className="values-list">
              <article>
                <span>
                  <Heart size={19} />
                </span>
                <div>
                  <h3>Care for the animals</h3>
                  <p>Pasture-raised and naturally fed, with health checked and recorded.</p>
                </div>
              </article>
              <article>
                <span>
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <h3>Full traceability</h3>
                  <p>Every animal and batch is logged back to its source and treatment.</p>
                </div>
              </article>
              <article>
                <span>
                  <Sprout size={19} />
                </span>
                <div>
                  <h3>Honest, direct sales</h3>
                  <p>No middlemen and no hidden costs — buy straight from the farm.</p>
                </div>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section roadmap-section">
        <div className="container">
          <Reveal className="roadmap-heading">
            <span className="eyebrow">How it works</span>
            <h2>From the farm to you in three steps.</h2>
          </Reveal>
          <Reveal className="roadmap">
            <article className="roadmap-active">
              <span>
                <Leaf size={20} />
              </span>
              <small>Step 1</small>
              <h3>Browse the shop</h3>
              <p>See what&apos;s fresh this week — produce and livestock with live availability.</p>
            </article>
            <article>
              <span>
                <Check size={20} />
              </span>
              <small>Step 2</small>
              <h3>Place your order</h3>
              <p>Add to cart and check out. No online payment — you settle on delivery or collection.</p>
            </article>
            <article>
              <span>
                <MapPin size={20} />
              </span>
              <small>Step 3</small>
              <h3>Collect or receive</h3>
              <p>Collect free at the farm or have it delivered. We confirm the details with you.</p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="section location-section">
        <div className="container">
          <Reveal>
            <div className="location-card">
              <div>
                <span className="location-icon">
                  <MapPin size={24} />
                </span>
                <h2>Find us at Mahlabane.</h2>
                <p>
                  {BUSINESS.location}. We&apos;re always happy to welcome visitors — call or WhatsApp
                  ahead and we&apos;ll show you around.
                </p>
                <Link className="button button-primary" href="/contact">
                  Contact us <ArrowRight size={17} />
                </Link>
              </div>
              <div>
                <h3>Opening hours</h3>
                <p style={{ margin: "10px 0 20px", fontSize: ".82rem" }}>
                  Mon–Sat · 7:00–17:00
                  <br />
                  Sunday · by appointment
                </p>
                <p style={{ fontSize: ".78rem" }}>
                  Phone {BUSINESS.phoneDisplay}
                  <br />
                  WhatsApp {BUSINESS.whatsappDisplay}
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
