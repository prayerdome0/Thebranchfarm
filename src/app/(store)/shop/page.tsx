"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { Leaf, PackageSearch, Search, ShoppingBag } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/store/ProductCard";
import { PRODUCT_CATEGORIES, PRODUCT_KIND_LABELS } from "@/lib/constants";
import { watchProducts } from "@/lib/firebase/data";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const KINDS = [
  { value: "all", label: "All" },
  { value: "produce", label: "Farm produce" },
  { value: "livestock", label: "Live animals" },
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
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    const stop = watchProducts((list) => {
      setProducts(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesKind = kind === "all" || product.kind === kind;
      const matchesCategory = category === "all" || product.category === category;
      const matchesQuery =
        !term ||
        [product.name, product.description, product.unit]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return matchesKind && matchesCategory && matchesQuery;
    });
  }, [products, kind, category, query]);

  const categories = PRODUCT_CATEGORIES.filter(
    (item) => kind === "all" || item.kind === kind,
  );

  return (
    <>
      <section className="page-hero shop-hero">
        <div className="container page-hero-inner">
          <span className="eyebrow eyebrow-light">The farm shop</span>
          <h1>Fresh produce &amp; healthy livestock.</h1>
          <p>
            Everything we sell comes straight from the farm at Mahlabane. Order online, then
            collect it here or arrange delivery.
          </p>
          <div className="shop-status-pills">
            <span>
              <Leaf size={14} /> Farm-direct
            </span>
            <span>
              <ShoppingBag size={14} /> Order without paying online
            </span>
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
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-scroll" role="tablist" aria-label="Filter by type">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(kind === option.value && "active")}
                onClick={() => {
                  setKind(option.value);
                  setCategory("all");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="shop-results-head">
            <span>
              {kind === "all" ? "All products" : PRODUCT_KIND_LABELS[kind as "produce" | "livestock"]}
              {" · "}
              {visible.length} item{visible.length === 1 ? "" : "s"}
            </span>
            <span className="catalog-sync">
              <i /> Live catalogue
            </span>
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
              description={
                products.length
                  ? "Try a different search, type or category."
                  : "Products will appear here as soon as the farm adds them."
              }
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
