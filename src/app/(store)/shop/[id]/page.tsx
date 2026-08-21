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
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { Loading } from "@/components/ui/Loading";
import { useCart } from "@/contexts/CartContext";
import { useStoreConfig } from "@/contexts/StoreConfigContext";
import { BLUR_PLACEHOLDER } from "@/lib/blur";
import { BUSINESS, PRODUCT_CATEGORY_LABELS, PRODUCT_KIND_LABELS } from "@/lib/constants";
import { getProduct, getProducts } from "@/lib/firebase/data";
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
                  <span
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "#9fb2a6",
                    }}
                  >
                    <ShoppingBag size={56} />
                  </span>
                )}
              </div>
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
                {PRODUCT_KIND_LABELS[product.kind]}
                <span>·</span>
                {PRODUCT_CATEGORY_LABELS[product.category] || product.category}
                <span className={comingSoon || (soldOut && !preOrder) ? "coming" : "available"}>
                  {comingSoon
                    ? "Coming soon"
                    : soldOut
                      ? preOrder
                        ? "Pre-order"
                        : "Out of stock"
                      : "In stock"}
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
              <div className="product-location">
                <MapPin size={15} /> Farm location: <strong>{BUSINESS.location}</strong>
              </div>

              {comingSoon && (
                <div className="coming-detail" style={{ marginTop: 18 }}>
                  <Leaf size={20} />
                  <div>
                    <strong>Coming soon</strong>
                    <span>
                      This line is on its way to the farm shop — the price shown is indicative.
                      WhatsApp us to be notified the moment it lands.
                    </span>
                  </div>
                </div>
              )}

              {preOrder && !comingSoon && (
                <div className="coming-detail" style={{ marginTop: 18 }}>
                  <Truck size={20} />
                  <div>
                    <strong>Available on pre-order</strong>
                    <span>Currently out of stock — order now and we&apos;ll reserve the next batch.</span>
                  </div>
                </div>
              )}

              <div className="detail-order-box">
                <label>
                  Quantity <small>({product.unit})</small>
                </label>
                <div className="quantity-wrap">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                    aria-label="Quantity"
                  />
                  <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity">
                    +
                  </button>
                </div>
                <div className="detail-total">
                  <span>Total</span>
                  <strong>{formatMoney(lineTotal)}</strong>
                </div>
                <div className="detail-buttons">
                  <button
                    className="button button-primary"
                    disabled={comingSoon || (soldOut && !preOrder)}
                    onClick={() => {
                      add(product, quantity);
                      router.push("/cart");
                    }}
                  >
                    <ShoppingBag size={18} /> {comingSoon ? "Coming soon" : "Add to cart"}
                  </button>
                  <Link className="button button-secondary" href="/track">
                    Track order
                  </Link>
                </div>
              </div>

              <div className="detail-assurances">
                <span>
                  <Truck size={19} />
                  <small>Delivery</small>
                  <strong>Pickup free · delivery from {formatMoney(deliveryFee)}</strong>
                </span>
                <span>
                  <ShieldCheck size={19} />
                  <small>Payment</small>
                  <strong>Pay on collection or delivery</strong>
                </span>
                <span>
                  <Leaf size={19} />
                  <small>Quality</small>
                  <strong>Farm-direct and traceable</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section related-section">
          <div className="container">
            <div className="related-heading">
              <h2>You might also like</h2>
              <Link href="/shop">
                View all <ArrowRight size={15} />
              </Link>
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
