"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileText, ShoppingBag, Trash2, Truck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuantityStepper } from "@/components/store/ProductCard";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";

export default function CartPage() {
  const { lines, subtotal, setQuantity, remove } = useCart();
  const { deliveryFee, freeDeliveryThreshold, formatMoney } = useStoreConfig();
  const [quoting, setQuoting] = useState(false);

  /** Builds a printable farm quotation for the current cart via /api/quotations. */
  const downloadQuotation = async () => {
    setQuoting(true);
    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            productId: line.productId,
            name: line.name,
            unit: line.unit,
            price: line.price,
            quantity: line.quantity,
          })),
        }),
      });
      if (!response.ok) throw new Error("quotation-failed");
      const html = await response.text();
      const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch {
      window.alert("Could not build the quotation right now. Please try again.");
    } finally {
      setQuoting(false);
    }
  };

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

  return (
    <section className="section cart-section">
      <div className="container">
        <div className="cart-page-head">
          <div>
            <span className="eyebrow">Your cart</span>
            <h1>Shopping basket</h1>
            <p>Review your items, then continue to checkout.</p>
          </div>
          <Link className="text-link" href="/shop">
            Continue shopping <ArrowRight size={15} />
          </Link>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            <div className="cart-table-head">
              <span>Product</span>
              <span>Quantity</span>
              <span style={{ textAlign: "right" }}>Total</span>
            </div>

            {lines.map((line) => (
              <div className="cart-item" key={line.productId}>
                <div className="cart-item-product">
                  <span className="cart-thumb">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={line.image} alt={line.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          color: "#9fb2a6",
                        }}
                      >
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
                  <QuantityStepper
                    small
                    value={line.quantity}
                    onChange={(next) => setQuantity(line.productId, next)}
                  />
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
            <div className="summary-line">
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <strong>{freeDelivery ? "Free" : `from ${formatMoney(deliveryFee)}`}</strong>
            </div>
            <div className="delivery-policy">
              <Truck size={17} />
              <div>
                <strong>Pickup is free at the farm</strong>
                <p>
                  Delivery {formatMoney(deliveryFee)}, free over {formatMoney(freeDeliveryThreshold)}.
                  Final fee confirmed at checkout.
                </p>
              </div>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <strong>{formatMoney(subtotal + (freeDelivery ? 0 : deliveryFee))}</strong>
            </div>
            <Link className="button button-primary button-large button-full" href="/checkout">
              Continue to checkout <ArrowRight size={18} />
            </Link>
            <button
              className="button button-secondary button-full"
              onClick={downloadQuotation}
              disabled={quoting}
              style={{ marginTop: 10 }}
            >
              <FileText size={17} /> {quoting ? "Preparing…" : "Download quotation"}
            </button>
            <div className="summary-note">
              <span>No online payment needed — pay on collection or delivery.</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
