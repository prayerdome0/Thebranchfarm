import Image from "next/image";
import Link from "next/link";
import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/constants";
import { phoneHref, whatsappHref } from "@/lib/utils";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grain" />
      <div className="container footer-grid">
        <div className="footer-brand-column">
          <div className="footer-logo">
            <Image src="/logo.png" alt="The Branch Farm" width={88} height={88} />
          </div>
          <div>
            <h2>The Branch Farm</h2>
            <p className="footer-slogan">Nayi Plug</p>
          </div>
          <p className="footer-intro">Fresh agricultural products, thoughtful service and connected farm operations — built in Eswatini.</p>
          <span className="illustration-note">Website farm visuals are brand illustrations.</span>
        </div>
        <div>
          <h3>Explore</h3>
          <ul className="footer-links">
            <li><Link href="/shop">Shop products</Link></li>
            <li><Link href="/about">Our farm</Link></li>
            <li><Link href="/gallery">Gallery</Link></li>
            <li><Link href="/videos">Farm films</Link></li>
            <li><Link href="/track-order">Track an order</Link></li>
            <li><Link href="/verify">Verify a document</Link></li>
          </ul>
        </div>
        <div>
          <h3>Contact</h3>
          <ul className="footer-contact">
            <li><MapPin size={18} /><span>{BUSINESS.location}</span></li>
            <li><Phone size={18} /><a href={phoneHref(BUSINESS.phoneLink)}>{BUSINESS.phoneDisplay}</a></li>
            <li><MessageCircle size={18} /><a href={whatsappHref(BUSINESS.whatsappLink)} target="_blank" rel="noreferrer">{BUSINESS.whatsappDisplay}</a></li>
            <li><Mail size={18} /><Link href="/contact">Send an enquiry</Link></li>
          </ul>
        </div>
        <div>
          <h3>Delivery</h3>
          <div className="delivery-footer-card">
            <strong>Free delivery</strong>
            <span>Manzini &amp; Matsapha</span>
          </div>
          <p className="footer-small"><Clock3 size={16} /> Other locations arranged upon request.</p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} The Branch Farm. All rights reserved.</span>
        <span>Established 2026 · Eswatini</span>
      </div>
    </footer>
  );
}
