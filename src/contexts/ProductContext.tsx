"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { INITIAL_PRODUCTS, PRODUCT_FALLBACK_IMAGES } from "@/lib/constants";
import { watchProducts } from "@/lib/firebase/data";
import type { Product } from "@/types";

function normalizeProduct(product: Product): Product {
  const fallback = PRODUCT_FALLBACK_IMAGES[product.category] || PRODUCT_FALLBACK_IMAGES.other;
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  return { ...product, images: images.length ? images : [fallback] };
}

interface ProductContextValue {
  products: Product[];
  loading: boolean;
  usingInitialCatalog: boolean;
  findProduct: (idOrSlug: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [usingInitialCatalog, setUsingInitialCatalog] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;
    try {
      const stop = watchProducts((incoming) => {
        if (cancelled) return;
        const normalized = incoming.map(normalizeProduct);
        setProducts(normalized);
        setUsingInitialCatalog(
          incoming === INITIAL_PRODUCTS ||
            incoming.every((item) => INITIAL_PRODUCTS.some((seed) => seed.id === item.id))
        );
        setLoading(false);
      });
      timeout = window.setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 3000) as unknown as number;
      return () => {
        cancelled = true;
        try {
          stop();
        } catch {}
        if (timeout) window.clearTimeout(timeout);
      };
    } catch {
      setLoading(false);
      return () => {
        cancelled = true;
        if (timeout) {
          try { window.clearTimeout(timeout); } catch {}
        }
      };
    }
  }, []);

  const value = useMemo(
    () => ({
      products,
      loading,
      usingInitialCatalog,
      findProduct: (idOrSlug: string) =>
        products.find((item) => item.id === idOrSlug || item.slug === idOrSlug),
    }),
    [products, loading, usingInitialCatalog],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) throw new Error("useProducts must be used inside ProductProvider");
  return context;
}
