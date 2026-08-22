"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone, MessageCircle, Truck, Mail } from "lucide-react";
import { BUSINESS } from "@/lib/constants";
import { useStoreConfig } from "@/contexts/StoreConfigContext";

export function SiteFooter() {
  const { deliveryFee, freeDeliveryThreshold, formatMoney } = useStoreConfig();
  return (
    <footer className="site-footer">
      <div className="footer-grain" />
      <div className="container footer-grid">
        <div className="footer-brand-column">
          <span className="footer-logo">
            <Image src="/logo.png" alt={BUSINESS.name} width={72} height={72} />
          </span>
          <h2>{BUSINESS.name}</h2>
          <span className="footer-slogan">{BUSINESS.slogan}</span>
          <p className="footer-intro">
            Fresh farm produce and healthy livestock from Mahlabane, Eswatini. Order online, collect at the farm or arrange delivery.
          </p>
        </div>

        <div>
          <h3>Shop</h3>
          <ul className="footer-links">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/shop">Shop</Link></li>
            <li><Link href="/our-farm">Our Farm</Link></li>
            <li><Link href="/gallery">Gallery</Link></li>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/cart">Cart</Link></li>
          </ul>
        </div>

        <div>
          <h3>Contact</h3>
          <ul className="footer-contact">
            <li><MapPin size={16} /> {BUSINESS.fullLocation || BUSINESS.location}</li>
            <li><Phone size={16} /> <Link href={`tel:${BUSINESS.phoneLink}`}>{BUSINESS.phoneDisplay}</Link></li>
            <li><MessageCircle size={16} /> <Link href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">{BUSINESS.whatsappDisplay}</Link></li>
            <li><Mail size={16} /> {BUSINESS.email}</li>
          </ul>
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="button button-whatsapp button-small" href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">
              <MessageCircle size={15} /> WhatsApp Us
            </a>
            <a className="button button-secondary button-small" href={`tel:${BUSINESS.phoneLink}`}>
              <Phone size={15} /> Call Us
            </a>
          </div>
        </div>

        <div>
          <h3>Delivery</h3>
          <div className="delivery-footer-card">
            <span><Truck size={15} /> {BUSINESS.deliveryFree}</span>
            <strong>{BUSINESS.deliveryOther}</strong>
          </div>
          <div className="footer-small">
            <span>Delivery from {formatMoney(deliveryFee)} · Free over {formatMoney(freeDeliveryThreshold)}</span>
          </div>
          <div className="footer-small" style={{ marginTop: 8 }}>
            <span>Pickup at the farm is free.</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {BUSINESS.name} · {BUSINESS.slogan} · All rights reserved.</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Mail size={13} /> {BUSINESS.location}
        </span>
      </div>
    </footer>
  );
}
