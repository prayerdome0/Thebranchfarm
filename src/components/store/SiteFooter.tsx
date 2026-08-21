import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone, MessageCircle, Truck } from "lucide-react";
import { BUSINESS, STORE } from "@/lib/constants";
import { money } from "@/lib/utils";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grain" />
      <div className="container footer-grid">
        <div className="footer-brand-column">
          <span className="footer-logo">
            <Image src="/logo.png" alt="" width={72} height={72} />
          </span>
          <h2>{BUSINESS.name}</h2>
          <span className="footer-slogan">{BUSINESS.slogan}</span>
          <p className="footer-intro">
            Livestock, farm produce and the full operation — kept together, traced to the source
            and ready for you.
          </p>
        </div>

        <div>
          <h3>Shop</h3>
          <ul className="footer-links">
            <li>
              <Link href="/shop">All products</Link>
            </li>
            <li>
              <Link href="/shop?kind=produce">Farm produce</Link>
            </li>
            <li>
              <Link href="/shop?kind=livestock">Live animals</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li>
              <Link href="/track">Track an order</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Contact</h3>
          <ul className="footer-contact">
            <li>
              <MapPin size={16} /> {BUSINESS.location}
            </li>
            <li>
              <Phone size={16} /> <Link href={`tel:${BUSINESS.phoneLink}`}>{BUSINESS.phoneDisplay}</Link>
            </li>
            <li>
              <MessageCircle size={16} />{" "}
              <Link href={`https://wa.me/${BUSINESS.whatsappLink}`} target="_blank" rel="noreferrer">
                {BUSINESS.whatsappDisplay}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Delivery</h3>
          <div className="delivery-footer-card">
            <span>
              <Truck size={15} /> Delivery from {money(STORE.deliveryFee)}
            </span>
            <strong>Free over {money(STORE.freeDeliveryThreshold)}</strong>
          </div>
          <div className="footer-small">
            <span>Pickup at the farm is free.</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
        </span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Mail size={13} /> Farm management &amp; store
        </span>
      </div>
    </footer>
  );
}
