"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORE } from "@/lib/constants";
import { getFarmSettings } from "@/lib/firebase/data";
import { formatMoney } from "@/lib/utils";
import type { FarmSettings } from "@/types";

interface StoreConfigValue {
  settings: FarmSettings;
  currency: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  promoCode: string;
  promoDiscountPercent: number;
  /** Formats an amount using the farm's configured currency. */
  formatMoney: (value: number | null | undefined) => string;
}

const StoreConfigContext = createContext<StoreConfigValue | null>(null);

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<FarmSettings>({
    farmName: "The Branch Farm",
    slogan: "Nayi Plug",
    location: "",
    phone: "",
    whatsapp: "",
    email: "",
    currency: STORE.currency,
    deliveryFee: STORE.deliveryFee,
    freeDeliveryThreshold: STORE.freeDeliveryThreshold,
    promoCode: "",
    promoDiscountPercent: 0,
    heroProductId: "",
  });

  useEffect(() => {
    getFarmSettings().then(setSettings);
  }, []);

  const value = useMemo<StoreConfigValue>(() => {
    const currency = settings.currency || STORE.currency;
    return {
      settings,
      currency,
      deliveryFee: settings.deliveryFee ?? STORE.deliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold ?? STORE.freeDeliveryThreshold,
      promoCode: (settings.promoCode || "").trim(),
      promoDiscountPercent: settings.promoDiscountPercent ?? 0,
      formatMoney: (amount) => formatMoney(amount, currency),
    };
  }, [settings]);

  return <StoreConfigContext.Provider value={value}>{children}</StoreConfigContext.Provider>;
}

export function useStoreConfig() {
  const context = useContext(StoreConfigContext);
  if (!context) throw new Error("useStoreConfig must be used inside StoreConfigProvider");
  return context;
}
