"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Product } from "@/types";

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_KEY = "the-branch-farm-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartItem[];
        setItems(parsed.filter((item) => item?.product?.id && item.quantity > 0));
      }
    } catch {
      window.localStorage.removeItem(CART_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (product.availability !== "available") return;
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, product, quantity: Math.min(999, item.quantity + quantity) }
            : item,
        );
      }
      return [...current, { product, quantity: Math.max(1, quantity) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.product.id !== productId));
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.min(999, Math.floor(quantity)) }
          : item,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.product.price * item.quantity, 0);

  const value = useMemo(
    () => ({ items, hydrated, itemCount, subtotal, addItem, removeItem, setQuantity, clearCart }),
    [items, hydrated, itemCount, subtotal, addItem, removeItem, setQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
