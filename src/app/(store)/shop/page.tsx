"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { Leaf, PackageSearch, Search, ShoppingBag, MessageCircle, Truck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/store/ProductCard";
import { PRODUCT_CATEGORIES, PRODUCT_KIND_LABELS, BUSINESS } from "@/lib/constants";
import { watchProducts } from "@/lib/firebase/data";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const KINDS = [
  { value: "all", label: "All" },
  { value: "produce", label: "Farm produce" },
  { value: "livestock", label: "Live animals" },
];

const AVAILABILITY = [
  { value: "all", label: "All" },
  { value: "available", label: "Available" },
  { value: "low", label: "Low Stock" },
  { value: "coming", label: "Coming Soon" },
];

function ShopCatalog() {
  const search = useSearchParams();
  const searchKey = search.toString();
  return (
    <ShopCatalogContent
      key={searchKey}
      initialKind={search.get("kind") || "all"}
      initialQuery={search.get("q") || ""}
    />
  );
}

function ShopCatalogContent({
  initialKind,
  initialQuery,
}: {
  initialKind: string;
  initialQuery: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState(initialKind);
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState("featured");

  useEffect(() => {
    const stop = watchProducts((list) => {
      setProducts(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    let filtered = products.filter((product) => {
      const matchesKind = kind === "all" || product.kind === kind;
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        !term ||
        [product.name, product.description, product.unit]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      let matchesAvail = true;
      if (availability === "available") matchesAvail = !product.comingSoon && (!product.trackInventory || product.stock > 0);
      if (availability === "low") matchesAvail = product.trackInventory && product.stock > 0 && product.stock <= 5;
      if (availability === "coming") matchesAvail = Boolean(product.comingSoon);
      return matchesKind && matchesCategory && matchesQuery && matchesAvail;
    });

    if (sort === "price-low") filtered = [...filtered].sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
    if (sort === "price-high") filtered = [...filtered].sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
    if (sort === "name") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [products, kind, category, query, availability, sort]);

  const categories = PRODUCT_CATEGORIES.filter(
    (item) => kind === "all" || item.kind === kind,
  );

  return (
    <>
      <section className="page-hero shop-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">The Branch Farm · {BUSINESS.slogan}</span>
          <h1>Fresh farm products</h1>
          <p>
            Fresh eggs, milk, emasi, vegetables and healthy livestock from Mahlabane. {BUSINESS.deliveryFree} {BUSINESS.deliveryOther}
          </p>
          <p className="shop-price-note">
            <strong>On sale now:</strong> Fresh milk E16 a litre · Sour milk Latsambile E20 · Sour milk
            Lashubile E35. Everything else below is marked <strong>Coming soon</strong> and cannot be
            ordered yet.
          </p>
          <div className="shop-status-pills">
            <span><Leaf size={14} /> Farm-direct</span>
            <span><Truck size={14} /> {BUSINESS.deliveryFree}</span>
            <span><MessageCircle size={14} /> Order on WhatsApp or Cart</span>
          </div>
        </div>
      </section>

      <section className="section shop-section">
        <div className="container">
          <div className="shop-toolbar">
            <div className="search-field">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search eggs, milk, cattle…"
                aria-label="Search products"
              />
            </div>
            <div className="select-field">
              <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="select-field">
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} aria-label="Availability">
                {AVAILABILITY.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div className="select-field">
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                <option value="featured">Featured</option>
                <option value="name">Name A-Z</option>
                <option value="price-low">Price Low-High</option>
                <option value="price-high">Price High-Low</option>
              </select>
            </div>
          </div>

          <div className="filter-scroll" role="tablist" aria-label="Filter by type">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(kind === option.value && "active")}
                onClick={() => { setKind(option.value); setCategory("all"); }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="shop-results-head">
            <span>
              {kind === "all" ? "All products" : PRODUCT_KIND_LABELS[kind as "produce" | "livestock"]} · {visible.length} item{visible.length === 1 ? "" : "s"}
            </span>
            <span className="catalog-sync"><i /> Live catalogue · Eswatini · Manzini & Matsapha delivery</span>
          </div>

          {loading ? (
            <Loading label="Loading the farm shop…" />
          ) : visible.length ? (
            <div className="product-grid">
              {visible.map((product, index) => (
                <Reveal key={product.id} delay={(index % 3) * 70}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title={products.length ? "No matching products" : "The shop is being stocked"}
              description={products.length ? "Try a different search, type or category." : "Products will appear here as soon as the farm adds them."}
            />
          )}
        </div>
      </section>
    </>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<Loading label="Loading shop…" />}>
      <ShopCatalog />
    </Suspense>
  );
}
