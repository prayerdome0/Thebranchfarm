/** PWA utilities — install prompt, display mode detection, badge, etc. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function setDeferredPrompt(event: BeforeInstallPromptEvent | null) {
  deferredPrompt = event;
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function isPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches;
}

export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome === "accepted";
  } catch {
    return false;
  }
}

export function canInstall(): boolean {
  return !!deferredPrompt;
}

// Badge API for cart count
export async function setAppBadge(count?: number): Promise<void> {
  if (typeof navigator === "undefined") return;
  const nav = navigator as unknown as {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count && count > 0 && nav.setAppBadge) {
      await nav.setAppBadge(count);
    } else if (nav.clearAppBadge) {
      await nav.clearAppBadge();
    }
  } catch {
    /* badge API is best-effort */
  }
}

export async function clearAppBadge(): Promise<void> {
  if (typeof navigator === "undefined") return;
  const nav = navigator as unknown as { clearAppBadge?: () => Promise<void> };
  try {
    await nav.clearAppBadge?.();
  } catch {
    /* ignore */
  }
}

// Check if service workers are supported
export function isServiceWorkerSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

// Check if push is supported
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// Share API
export async function shareContent(data: ShareData): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name === "AbortError") return false;
      return false;
    }
  }
  return false;
}

export function isShareSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.share;
}
