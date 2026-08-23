"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { StoreConfigProvider } from "@/contexts/StoreConfigContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ServiceWorkerRegister } from "@/components/ui/ServiceWorkerRegister";
import { PWAInstallPrompt } from "@/components/ui/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/ui/PWAUpdatePrompt";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <StoreConfigProvider>
            <ServiceWorkerRegister />
            <OfflineIndicator />
            <PWAInstallPrompt />
            <PWAUpdatePrompt />
            {children}
          </StoreConfigProvider>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
