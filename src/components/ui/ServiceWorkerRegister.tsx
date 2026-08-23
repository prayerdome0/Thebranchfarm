"use client";

import { useEffect } from "react";
import { isServiceWorkerSupported } from "@/lib/pwa";

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
          // There's an update waiting — will be handled by PWAUpdatePrompt
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
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(
                new CustomEvent("pwa:update-available", {
                  detail: newWorker,
                })
              );
            }
          });
        });

        // Log successful registration in development
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

    // Handle beforeinstallprompt globally
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent default mini-infobar
      e.preventDefault();
      // Store for later use via pwa lib
      const { setDeferredPrompt } = require("@/lib/pwa");
      setDeferredPrompt(e);
      // Dispatch custom event so UI can react
      window.dispatchEvent(
        new CustomEvent("pwa:installable", { detail: e })
      );
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  return null;
}
