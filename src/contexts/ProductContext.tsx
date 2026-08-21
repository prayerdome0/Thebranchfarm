"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { INITIAL_PRODUCTS } from "@/lib/constants";
import { watchProducts } from "@/lib/firebase/data";
import type { Product } from "@/types";

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
    const stop = watchProducts((incoming) => {
      setProducts(incoming);
      setUsingInitialCatalog(incoming === INITIAL_PRODUCTS || incoming.every((item) => INITIAL_PRODUCTS.some((seed) => seed.id === item.id)));
      setLoading(false);
    });
    const timeout = window.setTimeout(() => setLoading(false), 3000);
    return () => {
      stop();
      window.clearTimeout(timeout);
    };
  }, []);

  const value = useMemo(
    () => ({
      products,
      loading,
      usingInitialCatalog,
      findProduct: (idOrSlug: string) => products.find((item) => item.id === idOrSlug || item.slug === idOrSlug),
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
