"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { PRODUCT_KIND_LABELS, STORE } from "@/lib/constants";
import { money } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const outOfStock = product.trackInventory && product.stock <= 0;

  return (
    <article className="product-card">
      <Link href={`/shop/${product.id}`} className="product-image-wrap" aria-label={product.name}>
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="product-image" src={product.image} alt={product.name} />
        ) : (
          <span
            className="product-image"
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#9fb2a6",
            }}
          >
            <ShoppingBag size={40} />
          </span>
        )}
        <span
          className="availability-pill status-badge"
          style={outOfStock ? { background: "#fff0ee", color: "#a33b32" } : undefined}
        >
          {outOfStock ? "Out of stock" : "Available"}
        </span>
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{PRODUCT_KIND_LABELS[product.kind]}</span>
        </div>
        <Link href={`/shop/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <p>{product.description}</p>
        <div className="product-card-footer">
          <span className="price-stack">
            <strong>{money(product.price)}</strong>
            <small>
              per {product.unit}
              {product.trackInventory ? ` · ${product.stock} left` : ""}
            </small>
          </span>
          <button
            className="button button-primary button-small"
            onClick={() => add(product)}
            disabled={outOfStock}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>
    </article>
  );
}

export function AddToCartButton({ product, large = false }: { product: Product; large?: boolean }) {
  const { add } = useCart();
  return (
    <button
      className={large ? "button button-primary button-large" : "button button-primary"}
      onClick={() => add(product)}
      disabled={product.trackInventory && product.stock <= 0}
    >
      <ShoppingBag size={18} /> Add to cart
    </button>
  );
}

export function QuantityStepper({
  value,
  onChange,
  small = false,
}: {
  value: number;
  onChange: (next: number) => void;
  small?: boolean;
}) {
  return (
    <span className="quantity-wrap" style={small ? { gridTemplateColumns: "30px 40px 30px" } : undefined}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity">
        <Minus size={15} />
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
        aria-label="Quantity"
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <Plus size={15} />
      </button>
    </span>
  );
}

export function StorePrice({ value, note }: { value: number; note?: string }) {
  return (
    <span className="price-stack">
      <strong>
        {STORE.currency}
        {value.toLocaleString("en-SZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </strong>
      {note ? <small>{note}</small> : null}
    </span>
  );
}
