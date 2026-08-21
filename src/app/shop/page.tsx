"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProducts } from "@/contexts/ProductContext";
import type { ProductCategory } from "@/types";
import { cn } from "@/lib/utils";

const filters: Array<{ value: "all" | ProductCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "beef", label: "Beef" },
  { value: "pork", label: "Pork" },
  { value: "chicken", label: "Chicken" },
  { value: "other", label: "Other" },
];

export default function ShopPage() {
  const { products, loading } = useProducts();
  const [category, setCategory] = useState<"all" | ProductCategory>("all");
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<"all" | "available" | "coming-soon">("all");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) =>
      (category === "all" || product.category === category) &&
      (availability === "all" || product.availability === availability) &&
      (!term || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term)),
    );
  }, [products, category, search, availability]);

  const reset = () => { setCategory("all"); setAvailability("all"); setSearch(""); };

  return (
    <>
      <section className="page-hero shop-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">The farm shop</span>
          <h1>Fresh is only a few taps away.</h1>
          <p>Shop what is available today and get an honest preview of what we are growing next.</p>
          <div className="shop-status-pills"><span><i className="live-dot" /> Dairy available</span><span>Free delivery: Manzini &amp; Matsapha</span></div>
        </div>
      </section>
      <section className="section shop-section">
        <div className="container">
          <div className="shop-toolbar">
            <div className="search-field">
              <Search size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search milk, dairy, eggs…" aria-label="Search products" />
              {search && <button onClick={() => setSearch("")} aria-label="Clear search"><X size={17} /></button>}
            </div>
            <label className="select-field"><SlidersHorizontal size={18} /><select value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)} aria-label="Filter availability"><option value="all">All availability</option><option value="available">Available now</option><option value="coming-soon">Coming soon</option></select></label>
          </div>
          <div className="filter-scroll" role="group" aria-label="Product categories">
            {filters.map((filter) => <button key={filter.value} className={cn(category === filter.value && "active")} onClick={() => setCategory(filter.value)}>{filter.label}</button>)}
          </div>
          <div className="shop-results-head"><p><strong>{visible.length}</strong> product{visible.length === 1 ? "" : "s"}</p>{loading && <span className="catalog-sync"><i /> Syncing live catalogue</span>}</div>
          {visible.length ? (
            <div className="product-grid">{visible.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}</div>
          ) : (
            <EmptyState icon={Search} title="No products match" description="Try a different search or reset your filters." action={<button className="button button-secondary" onClick={reset}>Reset filters</button>} />
          )}
        </div>
      </section>
    </>
  );
}
