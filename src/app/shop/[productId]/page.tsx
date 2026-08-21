"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock3, MapPin, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ProductCard } from "@/components/products/ProductCard";
import { QuantityControl } from "@/components/products/QuantityControl";
import { useProducts } from "@/contexts/ProductContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";
import { money } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams<{ productId?: string }>();
  const router = useRouter();
  const { products, findProduct } = useProducts();
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const rawId = (params?.productId as string) || "";
  let decodedId = rawId;
  try {
    decodedId = rawId ? decodeURIComponent(rawId) : "";
  } catch {
    decodedId = rawId;
  }
  const product = decodedId ? findProduct(decodedId) : undefined;

  if (!product) return <section className="page-shell not-found-panel"><span>404</span><h1>Product not found</h1><p>This product may have moved or is no longer listed.</p><Link href="/shop" className="button button-primary"><ArrowLeft size={18} /> Back to shop</Link></section>;
  const available = product.availability === "available";
  const related = products.filter((item) => item.id !== product.id && item.category === product.category).slice(0, 3);

  const add = (buyNow = false) => {
    addItem(product, quantity);
    showToast(`${quantity} × ${product.name} added to your cart.`, "success");
    if (buyNow) router.push("/checkout");
  };

  return (
    <>
      <section className="product-detail-section section">
        <div className="container">
          <Breadcrumb items={[{ label: "Shop", href: "/shop" }, { label: product.name }]} />
          <div className="product-detail-grid">
            <div className="product-detail-image">
              <Image src={product.images[0]} alt={product.name} fill priority sizes="(max-width: 850px) 100vw, 50vw" />
              <span className="visual-label">AI-created product illustration</span>
            </div>
            <div className="product-detail-copy">
              <div className="product-detail-meta"><span>{product.category}</span><span className={available ? "available" : "coming"}>{available ? "Available now" : "Coming soon"}</span></div>
              <h1>{product.name}</h1>
              <p className="product-lede">{product.longDescription || product.description}</p>
              {available ? <div className="product-detail-price"><strong>{product.priceLabel || money(product.price)}</strong>{!product.priceLabel && <span>per {product.unit}</span>}</div> : <div className="coming-detail"><Clock3 size={20} /><div><strong>Not available for purchase yet</strong><span>We will activate ordering when this product is ready.</span></div></div>}
              {product.location && <p className="product-location"><MapPin size={18} /> Currently available in <strong>{product.location}</strong></p>}
              {available && (
                <div className="detail-order-box">
                  <label>Quantity <small>({product.unit}{quantity === 1 ? "" : "s"})</small></label>
                  <QuantityControl value={quantity} onChange={setQuantity} />
                  <div className="detail-total"><span>Product total</span><strong>{money(product.price * quantity)}</strong></div>
                  <div className="detail-buttons"><button className="button button-primary button-large" onClick={() => add(false)}><ShoppingBag size={19} /> Add to cart</button><button className="button button-secondary button-large" onClick={() => add(true)}>Buy now <ArrowRight size={18} /></button></div>
                </div>
              )}
              <div className="detail-assurances"><span><Truck size={18} /><small>Delivery</small><strong>Free in Manzini &amp; Matsapha</strong></span><span><ShieldCheck size={18} /><small>Secure order</small><strong>Official prices checked at checkout</strong></span><span><Check size={18} /><small>Need help?</small><strong>Call or WhatsApp our team</strong></span></div>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && <section className="section related-section"><div className="container"><div className="related-heading"><h2>You may also like</h2><Link href="/shop">View the full shop <ArrowRight size={17} /></Link></div><div className="product-grid">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></div></section>}
    </>
  );
}
