"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessSettingsProvider } from "@/contexts/BusinessSettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProductProvider } from "@/contexts/ProductContext";
import { SoundProvider } from "@/contexts/SoundContext";
import { ToastProvider } from "@/contexts/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SoundProvider>
        <BusinessSettingsProvider>
          <AuthProvider>
            <ProductProvider>
              <CartProvider>{children}</CartProvider>
            </ProductProvider>
          </AuthProvider>
        </BusinessSettingsProvider>
      </SoundProvider>
    </ToastProvider>
  );
}
