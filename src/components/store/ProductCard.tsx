"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, MessageCircle, Eye } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { BLUR_PLACEHOLDER } from "@/lib/blur";
import { PRODUCT_KIND_LABELS } from "@/lib/constants";
import { getProductWhatsAppLink } from "@/lib/whatsapp";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { formatMoney } = useStoreConfig();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const comingSoon = Boolean(product.comingSoon);
  const soldOut = product.trackInventory && product.stock <= 0;
  const preOrder = soldOut && product.allowBackorder;
  const price = product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.price;
  const available = !comingSoon && (!soldOut || preOrder);

  const handleAdd = () => {
    add(product, qty);
  };

  const handleBuyNow = () => {
    add(product, qty);
    router.push("/cart");
  };

  return (
    <article className="product-card">
      <Link href={`/shop/${product.id}`} className="product-image-wrap" aria-label={product.name}>
        {product.image ? (
          <Image
            className="product-image"
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 780px) 50vw, 25vw"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        ) : (
          <span className="product-image" style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9fb2a6" }}>
            <ShoppingBag size={40} />
          </span>
        )}
        <span className={`availability-pill ${comingSoon ? "coming" : available ? "available" : ""}`} style={{ position: "absolute", top: 12, left: 12, zIndex: 2 }}>
          {comingSoon ? "Coming soon" : soldOut ? (preOrder ? "Pre-order" : "Out of stock") : "Available"}
        </span>
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{PRODUCT_KIND_LABELS[product.kind]}</span>
          <span>{product.category}</span>
        </div>
        <Link href={`/shop/${product.id}`}><h3>{product.name}</h3></Link>
        <p style={{ minHeight: 44 }}>{product.description?.slice(0, 100)}{product.description && product.description.length > 100 ? "…" : ""}</p>

        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="price-stack">
            <strong>
              {formatMoney(price)}
              {product.salePrice != null && product.salePrice > 0 && (
                <small style={{ marginLeft: 6, color: "var(--muted)", textDecoration: "line-through", fontWeight: 500 }}>
                  {formatMoney(product.price)}
                </small>
              )}
            </strong>
            <small>per {product.unit} · {product.trackInventory ? `${product.stock} left` : "Available"}</small>
          </span>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 6, alignItems: "center" }}>
          <QuantityStepper value={qty} onChange={setQty} small />
          <span style={{ fontSize: ".7rem", color: "var(--muted)" }}>Qty</span>
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="button button-primary button-small" onClick={handleAdd} disabled={!available}>
            <ShoppingBag size={14} /> Add
          </button>
          <button className="button button-secondary button-small" onClick={handleBuyNow} disabled={!available}>
            Buy Now
          </button>
        </div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link className="button button-ghost button-small" href={`/shop/${product.id}`} style={{ border: "1px solid var(--line)" }}>
            <Eye size={14} /> Details
          </Link>
          <a className="button button-whatsapp button-small" href={getProductWhatsAppLink(product, qty)} target="_blank" rel="noreferrer">
            <MessageCircle size={14} /> WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}

export function AddToCartButton({ product, large = false }: { product: Product; large?: boolean }) {
  const { add } = useCart();
  const comingSoon = Boolean(product.comingSoon);
  const soldOut = product.trackInventory && product.stock <= 0 && !product.allowBackorder;
  return (
    <button className={large ? "button button-primary button-large" : "button button-primary"} onClick={() => add(product)} disabled={comingSoon || soldOut}>
      <ShoppingBag size={18} /> {comingSoon ? "Coming soon" : "Add to cart"}
    </button>
  );
}

export function QuantityStepper({ value, onChange, small = false }: { value: number; onChange: (next: number) => void; small?: boolean }) {
  return (
    <span className="quantity-wrap" style={small ? { gridTemplateColumns: "30px 40px 30px" } : undefined}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus size={15} /></button>
      <input type="number" min={1} value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} aria-label="Quantity" />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity"><Plus size={15} /></button>
    </span>
  );
}
