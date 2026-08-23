"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

    const handleUpdateFound = () => {
      if (!registration) return;
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setWaitingWorker(newWorker);
          setShowUpdate(true);
        }
      });
    };

    const handleControllerChange = () => {
      // New SW took over — reload to get fresh content
      window.location.reload();
    };

    navigator.serviceWorker.ready
      .then((reg) => {
        registration = reg;
        // Check if there's already a waiting worker
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdate(true);
        }
        reg.addEventListener("updatefound", handleUpdateFound);
      })
      .catch(() => {});

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    // Listen for messages from SW
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED") {
        // Optional: could show a toast instead of auto-reload
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      registration?.removeEventListener("updatefound", handleUpdateFound);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) {
      window.location.reload();
      return;
    }
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="pwa-update-prompt">
      <div className="pwa-update-content">
        <span className="pwa-update-icon">
          <RefreshCw size={18} />
        </span>
        <div className="pwa-update-text">
          <strong>Update available</strong>
          <small>A new version of The Branch Farm is ready</small>
        </div>
        <div className="pwa-update-actions">
          <button
            className="button button-primary button-small"
            onClick={handleUpdate}
          >
            <RefreshCw size={14} />
            Update
          </button>
          <button
            className="icon-button icon-button-small"
            onClick={handleDismiss}
            aria-label="Dismiss update"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
