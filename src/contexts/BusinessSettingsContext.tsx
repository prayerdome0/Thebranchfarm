"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { BUSINESS } from "@/lib/constants";

export interface PublicBusinessSettings {
  farmName: string;
  slogan: string;
  phone: string;
  whatsapp: string;
  location: string;
  email: string;
  currency: string;
  freeDeliveryAreas: string;
  otherDelivery: string;
  heroHeadline: string;
  announcement: string;
}

const defaults: PublicBusinessSettings = {
  farmName: BUSINESS.name,
  slogan: BUSINESS.slogan,
  phone: BUSINESS.phoneDisplay,
  whatsapp: BUSINESS.whatsappDisplay,
  location: BUSINESS.location,
  email: "",
  currency: BUSINESS.currency,
  freeDeliveryAreas: BUSINESS.freeDeliveryAreas.join(", "),
  otherDelivery: BUSINESS.deliveryNote,
  heroHeadline: "Fresh from our farm. Straight to you.",
  announcement: "Fresh milk available in Ngculwini",
};

const Context = createContext<PublicBusinessSettings>(defaults);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    try {
      return onSnapshot(
        doc(db, "settings", "business"),
        (snapshot) => {
          if (snapshot.exists()) setSettings((current) => ({ ...current, ...snapshot.data() }));
        },
        () => {}
      );
    } catch {
      return () => {};
    }
  }, []);
  const value = useMemo(() => settings, [settings]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBusinessSettings() {
  return useContext(Context);
}
