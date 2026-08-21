"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useCart } from "@/contexts/CartContext";
import { BUSINESS, PRODUCT_CATEGORY_LABELS, PRODUCT_KIND_LABELS } from "@/lib/constants";
import { getProduct, getProducts } from "@/lib/firebase/data";
import { money } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProduct(params.id).then((found) => {
      setProduct(found);
      setLoading(false);
    });
  }, [params.id]);

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

  const outOfStock = product ? product.trackInventory && product.stock <= 0 : false;
  const lineTotal = product ? product.price * quantity : 0;

  const content = useMemo(() => {
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
    return (
      <section className="section product-detail-section">
        <div className="container">
          <Link href="/shop" className="text-link" style={{ marginBottom: 22 }}>
            <ArrowLeft size={16} /> Back to shop
          </Link>

          <div className="product-detail-grid">
            <div className="product-detail-image">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

            <div className="product-detail-copy">
              <div className="product-detail-meta">
                {PRODUCT_KIND_LABELS[product.kind]}
                <span>·</span>
                {PRODUCT_CATEGORY_LABELS[product.category] || product.category}
                <span className={outOfStock ? "coming" : "available"}>
                  {outOfStock ? "Out of stock" : "In stock"}
                </span>
              </div>
              <h1>{product.name}</h1>
              <p className="product-lede">{product.description}</p>

              <div className="product-detail-price">
                <strong>{money(product.price)}</strong>
                <span>/ {product.unit}</span>
              </div>
              <div className="product-location">
                <MapPin size={15} /> Farm location: <strong>{BUSINESS.location}</strong>
              </div>

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
                    onChange={(event) =>
                      setQuantity(Math.max(1, Number(event.target.value) || 1))
                    }
                    aria-label="Quantity"
                  />
                  <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity">
                    +
                  </button>
                </div>
                <div className="detail-total">
                  <span>Total</span>
                  <strong>{money(lineTotal)}</strong>
                </div>
                <div className="detail-buttons">
                  <button
                    className="button button-primary"
                    disabled={outOfStock}
                    onClick={() => {
                      add(product, quantity);
                      router.push("/cart");
                    }}
                  >
                    <ShoppingBag size={18} /> Add to cart
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
                  <strong>Pickup free · delivery from {money(30)}</strong>
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
    );
  }, [loading, product, outOfStock, lineTotal, quantity, add, router]);

  return (
    <>
      {content}
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
