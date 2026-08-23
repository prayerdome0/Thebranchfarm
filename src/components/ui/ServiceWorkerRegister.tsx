"use client";

import { useEffect } from "react";
import { isServiceWorkerSupported, setDeferredPrompt } from "@/lib/pwa";

/**
 * Registers the service worker for PWA offline support.
 * Works in all environments (not just production) for better testing,
 * but handles failures gracefully.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!isServiceWorkerSupported()) return;

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        // Check for updates periodically (every 60 minutes)
        setInterval(
          () => {
            registration?.update().catch(() => {});
          },
          60 * 60 * 1000
        );

        // Handle waiting worker scenario on page load
        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent("pwa:update-available", {
              detail: registration.waiting,
            })
          );
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(
                new CustomEvent("pwa:update-available", {
                  detail: newWorker,
                })
              );
            }
          });
        });

        if (process.env.NODE_ENV === "development") {
          console.log("[PWA] Service Worker registered:", registration.scope);
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[PWA] Service Worker registration failed:", error);
        }
      }
    };

    register();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as import("@/lib/pwa").BeforeInstallPromptEvent);
      window.dispatchEvent(new CustomEvent("pwa:installable", { detail: e }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  return null;
}
