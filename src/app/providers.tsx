"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { StoreConfigProvider } from "@/contexts/StoreConfigContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <StoreConfigProvider>
            <ServiceWorkerRegister />
            {children}
          </StoreConfigProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
