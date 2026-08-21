"use client";

import { useEffect } from "react";

/** Registers the service worker in production for an installable offline shell. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline caching is a progressive enhancement — ignore failures */
    });
  }, []);

  return null;
}
