"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2 } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useProducts } from "@/contexts/ProductContext";

export default function ProductsPage() {
  const { products } = useProducts();
  const available = products.filter((product) => product.availability === "available");
  const future = products.filter((product) => product.availability === "coming-soon");
  return <><section className="page-hero products-hero"><div className="container page-hero-inner"><span className="eyebrow eyebrow-light">Our product range</span><h1>Available today. Growing for tomorrow.</h1><p>We separate active products from future plans clearly, so you always know what can genuinely be ordered.</p></div></section><section className="section"><div className="container"><SectionHeading eyebrow="Ready to order" title="Fresh dairy available now." description="These products have ordering enabled and their official prices are rechecked securely at checkout." action={<Link href="/shop" className="button button-primary">Open shop <ArrowRight size={17} /></Link>} /><div className="product-grid">{available.map((product) => <ProductCard product={product} key={product.id} />)}</div></div></section><section className="section future-products-section"><div className="container"><SectionHeading eyebrow="Our growing range" title="What is coming next." description="These lines are not yet for sale. An administrator can activate each product when the farm is genuinely ready." /><div className="future-product-grid">{future.map((product) => <article key={product.id}><div className="future-product-image"><Image src={product.images[0] || "/media/farm-hero.jpg"} alt={`${product.name} illustrative image`} fill sizes="(max-width: 620px) 120px, 170px" /><span className="future-product-badge"><Bell size={13} /> Coming soon</span><span className="visual-label visual-label-dark">Illustrative image</span></div><div className="future-product-copy"><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p><Link href={`/shop/${product.slug}`} className="future-product-link">Explore the range <ArrowRight size={14} /></Link></div></article>)}</div><div className="availability-promise"><CheckCircle2 size={21} /><p><strong>Our availability promise</strong><span>No unavailable item can be added to cart or submitted at checkout.</span></p></div></div></section></>;
}
