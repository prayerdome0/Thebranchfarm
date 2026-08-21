"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin, ShoppingBag, Trash2, Truck } from "lucide-react";
import { QuantityControl } from "@/components/products/QuantityControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCart } from "@/contexts/CartContext";
import { money } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, setQuantity, removeItem, hydrated } = useCart();
  if (!hydrated) return <section className="page-shell cart-loading"><i className="loader" /><p>Preparing your cart…</p></section>;
  if (!items.length) return <section className="page-shell empty-cart-page"><EmptyState icon={ShoppingBag} title="Your cart is ready for something fresh" description="Browse the active dairy range and add what you need." action={<Link href="/shop" className="button button-primary">Visit the shop <ArrowRight size={18} /></Link>} /></section>;
  return (
    <section className="section cart-section"><div className="container"><div className="cart-page-head"><div><span className="eyebrow">Your basket</span><h1>Review your order.</h1><p>{items.reduce((sum, item) => sum + item.quantity, 0)} item{items.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"} ready for checkout</p></div><Link href="/shop" className="text-link"><ArrowLeft size={17} /> Continue shopping</Link></div>
      <div className="cart-layout"><div className="cart-items"><div className="cart-table-head"><span>Product</span><span>Quantity</span><span>Total</span></div>{items.map(({ product, quantity }) => <article className="cart-item" key={product.id}><div className="cart-item-product"><div className="cart-thumb"><Image src={product.images[0]} alt="" fill sizes="92px" /></div><div><small>{product.category}</small><Link href={`/shop/${product.slug}`}>{product.name}</Link><span>{product.priceLabel || `${money(product.price)} / ${product.unit}`}</span></div></div><div className="cart-item-quantity"><QuantityControl value={quantity} onChange={(value) => setQuantity(product.id, value)} /><button className="remove-cart-item" onClick={() => removeItem(product.id)}><Trash2 size={16} /> Remove</button></div><strong className="cart-line-total">{money(product.price * quantity)}</strong></article>)}</div>
        <aside className="cart-summary"><h2>Order summary</h2><div className="summary-line"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div className="summary-line delivery-line"><span>Delivery</span><strong>At checkout</strong></div><div className="delivery-policy"><Truck size={20} /><div><strong>Free around Manzini &amp; Matsapha</strong><p>Other locations are arranged. We will not add an invented fee.</p></div></div><div className="summary-total"><span>Current total</span><strong>{money(subtotal)}</strong></div><Link href="/checkout" className="button button-primary button-large button-full">Continue to checkout <ArrowRight size={18} /></Link><p className="summary-note"><MapPin size={15} /> Enter your location at checkout to confirm delivery.</p></aside>
      </div>
    </div></section>
  );
}
