"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bell, MapPin, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { useSound } from "@/contexts/SoundContext";
import { money } from "@/lib/utils";
import type { Product } from "@/types";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const { playTap } = useSound();
  const available = product.availability === "available";

  const add = () => {
    addItem(product);
    playTap();
    showToast(`${product.name} added to your cart.`, "success");
  };

  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-image-wrap" aria-label={`View ${product.name}`}>
        <Image
          src={product.images[0] || "/media/farm-hero.jpg"}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="product-image"
          priority={priority}
        />
        <span className={`availability-pill ${available ? "available" : "coming"}`}>
          {available ? "Available now" : product.availability === "coming-soon" ? "Coming soon" : "Unavailable"}
        </span>
        <span className="visual-label">Brand illustration</span>
      </Link>
      <div className="product-card-body">
        <div className="product-card-meta">
          <span>{product.category}</span>
          {product.location && <span><MapPin size={13} /> {product.location}</span>}
        </div>
        <Link href={`/shop/${product.slug}`}><h3>{product.name}</h3></Link>
        <p>{product.description}</p>
        <div className="product-card-footer">
          {available ? (
            <div className="price-stack">
              <strong>{product.priceLabel || money(product.price)}</strong>
              {!product.priceLabel && <small>per {product.unit}</small>}
            </div>
          ) : (
            <div className="coming-copy"><Bell size={17} /><span>Launching later</span></div>
          )}
          <div className="product-actions">
            <Link className="icon-button" href={`/shop/${product.slug}`} aria-label={`View ${product.name}`}><ArrowUpRight size={19} /></Link>
            {available && (
              <button className="button button-small button-primary add-button" onClick={add}>
                <Plus size={17} /><span className="add-button-label">Add</span><ShoppingBag size={16} className="add-button-mobile-icon" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
