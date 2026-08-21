"use client";

import Link from "next/link";
import { ArrowRight, Bell, CheckCircle2, Clock3 } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useProducts } from "@/contexts/ProductContext";

export default function ProductsPage() {
  const { products } = useProducts();
  const available = products.filter((product) => product.availability === "available");
  const future = products.filter((product) => product.availability === "coming-soon");
  return <><section className="page-hero products-hero"><div className="container page-hero-inner"><span className="eyebrow eyebrow-light">Our product range</span><h1>Available today. Growing for tomorrow.</h1><p>We separate active products from future plans clearly, so you always know what can genuinely be ordered.</p></div></section><section className="section"><div className="container"><SectionHeading eyebrow="Ready to order" title="Fresh dairy available now." description="These products have ordering enabled and their official prices are rechecked securely at checkout." action={<Link href="/shop" className="button button-primary">Open shop <ArrowRight size={17} /></Link>} /><div className="product-grid">{available.map((product) => <ProductCard product={product} key={product.id} />)}</div></div></section><section className="section future-products-section"><div className="container"><SectionHeading eyebrow="Our growing range" title="What is coming next." description="These lines are not yet for sale. An administrator can activate each product when the farm is genuinely ready." /><div className="future-product-grid">{future.map((product) => <article key={product.id}><span><Clock3 size={21} /></span><div><small>{product.category}</small><h3>{product.name}</h3><p>{product.description}</p></div><strong><Bell size={14} /> Coming soon</strong></article>)}</div><div className="availability-promise"><CheckCircle2 size={21} /><p><strong>Our availability promise</strong><span>No unavailable item can be added to cart or submitted at checkout.</span></p></div></div></section></>;
}
