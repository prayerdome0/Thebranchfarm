"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  MessageCircle,
} from "lucide-react";
import { InlineVideo } from "@/components/store/InlineVideo";
import { ProductCard } from "@/components/store/ProductCard";
import { Loading } from "@/components/ui/Loading";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { BLUR_PLACEHOLDER } from "@/lib/blur";
import { BUSINESS, PRODUCT_CATEGORY_LABELS, PRODUCT_KIND_LABELS } from "@/lib/constants";
import { getProduct, getProducts } from "@/lib/firebase/data";
import { getProductWhatsAppLink } from "@/lib/whatsapp";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetail key={id} id={id} />;
}

function ProductDetail({ id }: { id: string }) {
  const router = useRouter();
  const { add } = useCart();
  const { formatMoney, deliveryFee } = useStoreConfig();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProduct(id).then((found) => {
      setProduct(found);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    getProducts().then((list) => {
      setRelated(
        list
          .filter(
            (item) =>
              item.id !== product.id &&
              (item.kind === product.kind || item.category === product.category),
          )
          .slice(0, 3),
      );
    });
  }, [product]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const primary = product.image ? [product.image] : [];
    const rest = product.images || [];
    return [...primary, ...rest.filter((url) => url && url !== product.image)];
  }, [product]);

  const [activeImage, setActiveImage] = useState(0);

  if (loading) return <Loading label="Loading product…" />;

  if (!product) {
    return (
      <section className="page-shell not-found-panel">
        <span>404</span>
        <h1>Product not found.</h1>
        <p>This product may have been removed from the shop.</p>
        <Link href="/shop" className="button button-primary">
          <ArrowLeft size={18} /> Back to the shop
        </Link>
      </section>
    );
  }

  const soldOut = product.trackInventory && product.stock <= 0;
  const preOrder = soldOut && product.allowBackorder;
  const comingSoon = Boolean(product.comingSoon);
  const price = product.salePrice != null && product.salePrice > 0 ? product.salePrice : product.price;
  const lineTotal = price * quantity;
  const available = !comingSoon && (!soldOut || preOrder);

  return (
    <>
      <section className="section product-detail-section">
        <div className="container">
          <Link href="/shop" className="text-link" style={{ marginBottom: 22 }}>
            <ArrowLeft size={16} /> Back to shop
          </Link>

          <div className="product-detail-grid">
            <div>
              <div className="product-detail-image">
                {gallery.length ? (
                  <Image
                    src={gallery[activeImage]}
                    alt={product.name}
                    fill
                    sizes="50vw"
                    priority
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDER}
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9fb2a6" }}>
                    <ShoppingBag size={56} />
                  </span>
                )}
                <span className={`availability-pill ${comingSoon ? "coming" : available ? "available" : ""}`} style={{ position: "absolute", top: 16, left: 16, zIndex: 2 }}>
                  {comingSoon ? "Coming soon" : soldOut ? (preOrder ? "Pre-order" : "Out of stock") : "Available"}
                </span>
              </div>
              {product.videoUrl && (
                <div className="product-detail-video">
                  <span className="eyebrow">Watch it</span>
                  <InlineVideo
                    src={product.videoUrl}
                    poster={product.videoPosterUrl || product.image}
                    label={`${product.name} on film`}
                  />
                </div>
              )}
              {gallery.length > 1 && (
                <div className="product-thumbs">
                  {gallery.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      className={index === activeImage ? "active" : ""}
                      onClick={() => setActiveImage(index)}
                      aria-label={`View image ${index + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="product-detail-copy">
              <div className="product-detail-meta">
                {PRODUCT_KIND_LABELS[product.kind]} <span>·</span> {PRODUCT_CATEGORY_LABELS[product.category] || product.category}
                <span className={comingSoon || (soldOut && !preOrder) ? "coming" : "available"}>
                  {comingSoon ? "Coming soon" : soldOut ? (preOrder ? "Pre-order" : "Out of stock") : "In stock"}
                </span>
              </div>
              <h1>{product.name}</h1>
              <p className="product-lede">{product.description}</p>

              <div className="product-detail-price">
                <strong>{formatMoney(price)}</strong>
                {product.salePrice != null && product.salePrice > 0 && (
                  <span style={{ textDecoration: "line-through" }}>{formatMoney(product.price)}</span>
                )}
                <span>/ {product.unit}</span>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: ".8rem", color: "var(--muted)" }}>
                <span>Price: {formatMoney(price)}</span>
                <span>Unit: {product.unit}</span>
                <span>Availability: {comingSoon ? "Coming soon" : soldOut ? (preOrder ? "Pre-order" : "Out of stock") : `${product.trackInventory ? product.stock + " left" : "Available"}`}</span>
              </div>

              <div className="product-location" style={{ marginTop: 12 }}>
                <MapPin size={15} /> Farm: <strong>{BUSINESS.location}</strong> · {BUSINESS.deliveryFree}
              </div>

              {comingSoon && (
                <div className="coming-detail" style={{ marginTop: 18 }}>
                  <Leaf size={20} />
                  <div>
                    <strong>Coming soon</strong>
                    <span>This product is on its way — price shown is indicative. WhatsApp us to be notified.</span>
                  </div>
                </div>
              )}

              {preOrder && !comingSoon && (
                <div className="coming-detail" style={{ marginTop: 18 }}>
                  <Truck size={20} />
                  <div>
                    <strong>Available on pre-order</strong>
                    <span>Currently out of stock — order now and we reserve next batch.</span>
                  </div>
                </div>
              )}

              <div className="detail-order-box">
                <label>Quantity <small>({product.unit})</small></label>
                <div className="quantity-wrap">
                  <button type="button" onClick={() => setQuantity((v) => Math.max(1, v - 1))} aria-label="Decrease">−</button>
                  <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" />
                  <button type="button" onClick={() => setQuantity((v) => v + 1)} aria-label="Increase">+</button>
                </div>
                <div className="detail-total">
                  <span>Subtotal ({quantity} × {formatMoney(price)})</span>
                  <strong>{formatMoney(lineTotal)}</strong>
                </div>
                <div className="detail-buttons">
                  <button
                    className="button button-primary"
                    disabled={!available}
                    onClick={() => { add(product, quantity); router.push("/cart"); }}
                  >
                    <ShoppingBag size={18} /> Buy Now
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!available}
                    onClick={() => { add(product, quantity); }}
                  >
                    Add to Cart
                  </button>
                </div>
                <a
                  className="button button-whatsapp button-full"
                  style={{ marginTop: 10 }}
                  href={getProductWhatsAppLink(product, quantity)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle size={18} /> Order on WhatsApp
                </a>
              </div>

              <div className="detail-assurances">
                <span><Truck size={19} /><small>Delivery</small><strong>{BUSINESS.deliveryFree}</strong></span>
                <span><ShieldCheck size={19} /><small>Payment</small><strong>Pay on collection/delivery</strong></span>
                <span><Leaf size={19} /><small>Quality</small><strong>Farm-direct & traceable</strong></span>
              </div>

              <div style={{ marginTop: 24, padding: 18, background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
                <h3 style={{ fontFamily: "var(--sans)", fontSize: ".95rem" }}>Full description</h3>
                <p style={{ marginTop: 8, fontSize: ".85rem", lineHeight: 1.7 }}>{product.description}</p>
                <ul style={{ marginTop: 12, fontSize: ".8rem", color: "var(--muted)", display: "grid", gap: 4 }}>
                  <li>Product: {product.name}</li>
                  <li>Price: {formatMoney(price)} per {product.unit}</li>
                  <li>Unit: {product.unit}</li>
                  <li>Availability: {available ? "Available" : comingSoon ? "Coming soon" : "Out of stock"}</li>
                  <li>Category: {PRODUCT_CATEGORY_LABELS[product.category] || product.category}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section related-section">
          <div className="container">
            <div className="related-heading">
              <h2>Related products</h2>
              <Link href="/shop">View all <ArrowRight size={15} /></Link>
            </div>
            <div className="product-grid">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
