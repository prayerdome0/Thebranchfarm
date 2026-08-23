import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff, ShoppingBag, Home, MapPin, Phone } from "lucide-react";
import { BUSINESS } from "@/lib/constants";
import { OfflineRetryButton } from "@/components/store/OfflineClient";

export const metadata: Metadata = {
  title: "Offline — The Branch Farm",
  description: "You are offline. Browse cached products or visit us at the farm.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="offline-page">
      <div className="offline-container">
        <div className="offline-icon-wrap">
          <WifiOff size={48} />
        </div>
        <h1>You are offline</h1>
        <p className="offline-lead">
          No internet connection detected. You can still browse cached products,
          view your cart, and access previously visited pages.
        </p>

        <div className="offline-actions">
          <Link href="/" className="button button-primary">
            <Home size={18} />
            Go to Homepage
          </Link>
          <Link href="/shop" className="button button-secondary">
            <ShoppingBag size={18} />
            Browse Cached Products
          </Link>
        </div>

        <div className="offline-info-grid">
          <div className="offline-info-card">
            <MapPin size={20} />
            <div>
              <strong>Visit the Farm</strong>
              <span>{BUSINESS.fullLocation}</span>
              <small>{BUSINESS.location}</small>
            </div>
          </div>
          <div className="offline-info-card">
            <Phone size={20} />
            <div>
              <strong>Contact Us</strong>
              <span>{BUSINESS.phoneDisplay}</span>
              <small>{BUSINESS.whatsappDisplay} (WhatsApp)</small>
            </div>
          </div>
        </div>

        <div className="offline-tips">
          <h3>While offline, you can:</h3>
          <ul>
            <li>✓ Browse products you&apos;ve visited before</li>
            <li>✓ View your cart and saved items</li>
            <li>✓ Check your recent orders (cached)</li>
            <li>✓ Read about our farm and practices</li>
            <li>✓ Prepare your order for when you&apos;re back online</li>
          </ul>
          <p>
            Your cart is saved locally and will be available when you reconnect.
            Orders placed offline will sync automatically.
          </p>
        </div>

        <OfflineRetryButton />
      </div>
    </div>
  );
}
