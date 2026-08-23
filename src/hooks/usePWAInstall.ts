"use client";

import { useEffect, useState, useCallback } from "react";
import {
  type BeforeInstallPromptEvent,
  setDeferredPrompt,
  getDeferredPrompt,
  promptInstall,
  isPWAInstalled,
} from "@/lib/pwa";

export interface UsePWAInstallReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  install: () => Promise<boolean>;
  dismiss: () => void;
}

export function usePWAInstall(): UsePWAInstallReturn {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Initial check
    setIsInstalled(isPWAInstalled());
    setIsStandalone(
      typeof window !== "undefined" &&
        window.matchMedia("(display-mode: standalone)").matches
    );

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      setIsInstalled(e.matches || isPWAInstalled());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const mql = window.matchMedia("(display-mode: standalone)");
    // Safari < 14 doesn't support addEventListener on MediaQueryList
    if ((mql as MediaQueryList).addEventListener) {
      mql.addEventListener("change", handleDisplayModeChange);
    } else {
      (mql as unknown as { addListener: (cb: (e: MediaQueryListEvent) => void) => void }).addListener(handleDisplayModeChange);
    }

    // If prompt was already captured before hook mounted
    if (getDeferredPrompt()) {
      setIsInstallable(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      if ((mql as MediaQueryList).removeEventListener) {
        mql.removeEventListener("change", handleDisplayModeChange);
      } else {
        (mql as unknown as { removeListener: (cb: (e: MediaQueryListEvent) => void) => void }).removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result) {
      setIsInstallable(false);
      setIsInstalled(true);
    }
    return result;
  }, []);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
    setIsInstallable(false);
  }, []);

  return { isInstallable, isInstalled, isStandalone, install, dismiss };
}
