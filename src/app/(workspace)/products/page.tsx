"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_KIND_LABELS,
} from "@/lib/constants";
import { deleteProduct, seedDemoProducts, watchAllProducts } from "@/lib/firebase/data";
import { cn, money } from "@/lib/utils";
import type { Product, ProductKind } from "@/types";

const FILTERS: { value: ProductKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "produce", label: "Farm produce" },
  { value: "livestock", label: "Live animals" },
];

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProductKind | "all">("all");
  const [search, setSearch] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const stop = watchAllProducts((list) => {
      setProducts(list);
      setLoading(false);
    });
    return () => stop();
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesFilter = filter === "all" || product.kind === filter;
      const matchesSearch =
        !term || [product.name, product.category, product.description].some((value) =>
          String(value).toLowerCase().includes(term),
        );
      return matchesFilter && matchesSearch;
    });
  }, [products, filter, search]);

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    await deleteProduct(product.id);
    showToast("Product deleted", "success");
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedDemoProducts();
      showToast(`${count} sample products added`, "success");
    } catch {
      showToast("Could not add sample products", "error");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="dashboard-stack">
      <section className="dashboard-section-title">
        <div>
          <h2>Products</h2>
          <p>Manage the online shop catalogue — produce and livestock with prices and stock.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {products.length === 0 && (
            <button className="button button-secondary" onClick={handleSeed} disabled={seeding}>
              <Sparkles size={17} /> {seeding ? "Adding…" : "Add sample products"}
            </button>
          )}
          <Link className="button button-primary" href="/products/new">
            <Plus size={18} /> Add product
          </Link>
        </div>
      </section>

      <div className="farm-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
        </div>
      </div>

      <div className="filter-scroll" role="tablist" aria-label="Filter by type">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={cn(filter === option.value && "active")}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading label="Loading products…" />
      ) : visible.length ? (
        <div className="dashboard-panel people-panel">
          <div className="admin-product-table">
            <div className="table-head">
              <span>Product</span>
              <span>Type</span>
              <span>Price</span>
              <span>Stock</span>
              <span />
            </div>
            {visible.map((product) => (
              <article key={product.id}>
                <span className="admin-product-name">
                  <i>
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Package size={20} />
                    )}
                  </i>
                  <span>
                    <strong>{product.name}</strong>
                    <small>
                      {PRODUCT_CATEGORY_LABELS[product.category] || product.category}
                      {product.comingSoon ? " · coming soon" : ""}
                      {!product.active ? " · hidden" : product.featured ? " · featured" : ""}
                    </small>
                  </span>
                </span>
                <span>{PRODUCT_KIND_LABELS[product.kind]}</span>
                <span>
                  {money(product.price)} <small>/ {product.unit}</small>
                </span>
                <span>
                  {product.trackInventory ? (
                    <span className={product.stock <= 0 ? "role-pill role-user" : ""}>
                      {product.stock} left
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
                <span className="person-actions">
                  <Link className="icon-button icon-button-small" href={`/products/${product.id}/edit`} aria-label="Edit">
                    <Pencil size={15} />
                  </Link>
                  <button
                    className="icon-button icon-button-small"
                    onClick={() => handleDelete(product)}
                    aria-label="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </span>
              </article>
            ))}
          </div>
        </div>
      ) : products.length ? (
        <EmptyState
          icon={Search}
          title="No matching products"
          description="Try a different search or filter."
        />
      ) : (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product, or load the sample catalogue to get started."
          action={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="button button-primary" href="/products/new">
                <Plus size={18} /> Add product
              </Link>
              <button className="button button-secondary" onClick={handleSeed} disabled={seeding}>
                <Sparkles size={17} /> Load sample products
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
