"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ShoppingBag, Trash2, Truck, MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuantityStepper } from "@/components/store/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { getCartWhatsAppLink } from "@/lib/whatsapp";
import { BUSINESS } from "@/lib/constants";

export default function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const { deliveryFee, freeDeliveryThreshold, formatMoney } = useStoreConfig();

  if (!lines.length) {
    return (
      <section className="section cart-section empty-cart-page">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse the farm shop and add fresh produce or livestock to get started."
          action={
            <Link className="button button-primary" href="/shop">
              Browse the shop <ArrowRight size={17} />
            </Link>
          }
        />
      </section>
    );
  }

  const freeDelivery = subtotal >= freeDeliveryThreshold;
  const delivery = freeDelivery ? 0 : deliveryFee;
  const total = subtotal + delivery;

  return (
    <section className="section cart-section">
      <div className="container">
        <div className="cart-page-head">
          <div>
            <span className="eyebrow">Your cart</span>
            <h1>Shopping basket</h1>
            <p>{BUSINESS.deliveryFree} {BUSINESS.deliveryOther}</p>
          </div>
          <Link className="text-link" href="/shop">Continue Shopping <ArrowRight size={15} /></Link>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-table-head">
              <span>Product</span>
              <span>Quantity</span>
              <span style={{ textAlign: "right" }}>Subtotal</span>
            </div>

            {lines.map((line) => (
              <div className="cart-item" key={line.productId}>
                <div className="cart-item-product">
                  <span className="cart-thumb">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt={line.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9fb2a6" }}>
                        <ShoppingBag size={26} />
                      </span>
                    )}
                  </span>
                  <div>
                    <small>per {line.unit}</small>
                    <Link href={`/shop/${line.productId}`}>{line.name}</Link>
                    <span>{formatMoney(line.price)} each</span>
                  </div>
                </div>
                <div className="cart-item-quantity">
                  <QuantityStepper small value={line.quantity} onChange={(next) => setQuantity(line.productId, next)} />
                  <button className="remove-cart-item" onClick={() => remove(line.productId)}>
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
                <div className="cart-line-total">{formatMoney(line.price * line.quantity)}</div>
              </div>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>
            <div className="summary-line"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
            <div className="summary-line"><span>Delivery</span><strong>{freeDelivery ? "Free" : formatMoney(delivery)}</strong></div>
            <div className="summary-line"><span>Total</span><strong>{formatMoney(total)}</strong></div>

            <div className="delivery-policy">
              <Truck size={17} />
              <div>
                <strong>{BUSINESS.deliveryFree}</strong>
                <p>{BUSINESS.deliveryOther} Pickup free at farm. Delivery {formatMoney(deliveryFee)}, free over {formatMoney(freeDeliveryThreshold)}.</p>
              </div>
            </div>

            <div className="summary-total">
              <span>Total to pay on collection/delivery</span>
              <strong>{formatMoney(total)}</strong>
            </div>

            <Link className="button button-primary button-large button-full" href="/checkout">
              Checkout <ArrowRight size={18} />
            </Link>

            <Link className="button button-secondary button-full" href="/shop" style={{ marginTop: 10 }}>
              Continue Shopping
            </Link>

            <a className="button button-whatsapp button-full" href={getCartWhatsAppLink(lines, subtotal)} target="_blank" rel="noreferrer" style={{ marginTop: 10 }}>
              <MessageCircle size={17} /> Order on WhatsApp
            </a>

            <div className="summary-note">
              <span>No online payment — pay on collection or delivery. WhatsApp or cart — your choice.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
