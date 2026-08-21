"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { BLUR_PLACEHOLDER } from "@/lib/blur";
import { PRODUCT_KIND_LABELS } from "@/lib/constants";
import type { Product } from "@/types";

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const { formatMoney } = useStoreConfig();
  const soldOut = product.trackInventory && product.stock <= 0;
  const preOrder = soldOut && product.allowBackorder;
  const price = product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.price;

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
          style={soldOut && !preOrder ? { background: "#fff0ee", color: "#a33b32" } : undefined}
        >
          {product.salePrice != null && product.salePrice > 0
            ? "Sale"
            : soldOut
              ? preOrder
                ? "Pre-order"
                : "Out of stock"
              : "Available"}
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
            <strong>
              {formatMoney(price)}
              {product.salePrice != null && product.salePrice > 0 && (
                <small
                  style={{
                    marginLeft: 6,
                    color: "var(--muted)",
                    textDecoration: "line-through",
                    fontWeight: 500,
                  }}
                >
                  {formatMoney(product.price)}
                </small>
              )}
            </strong>
            <small>
              per {product.unit}
              {product.trackInventory ? ` · ${product.stock} left` : ""}
            </small>
          </span>
          <button
            className="button button-primary button-small"
            onClick={() => add(product)}
            disabled={soldOut && !preOrder}
            aria-label={`Add ${product.name} to cart`}
          >
            <Plus size={16} /> {preOrder ? "Pre-order" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function AddToCartButton({ product, large = false }: { product: Product; large?: boolean }) {
  const { add } = useCart();
  const soldOut = product.trackInventory && product.stock <= 0 && !product.allowBackorder;
  return (
    <button
      className={large ? "button button-primary button-large" : "button button-primary"}
      onClick={() => add(product)}
      disabled={soldOut}
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
