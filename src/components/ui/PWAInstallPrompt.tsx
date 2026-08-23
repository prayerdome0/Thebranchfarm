"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

const DISMISS_KEY = "thebranchfarm:pwa-install-dismissed";
const DISMISS_DAYS = 7;

function shouldShowPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return true;
    const dismissedAt = parseInt(raw, 10);
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return daysSince > DISMISS_DAYS;
  } catch {
    return true;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    /* ignore */
  }
}

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, install, dismiss } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!isInstallable || isInstalled) {
      setVisible(false);
      return;
    }
    if (!shouldShowPrompt()) {
      setVisible(false);
      return;
    }
    // Delay showing by 3 seconds to not be intrusive
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled]);

  if (!visible || !isInstallable || isInstalled) return null;

  const handleInstall = async () => {
    setInstalling(true);
    const success = await install();
    setInstalling(false);
    if (success) {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    markDismissed();
    dismiss();
    setVisible(false);
  };

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <span className="pwa-install-icon">
          <Smartphone size={20} />
        </span>
        <div className="pwa-install-text">
          <strong>Install The Branch Farm app</strong>
          <small>Add to home screen for offline access, faster shopping & order tracking</small>
        </div>
        <div className="pwa-install-actions">
          <button
            className="button button-primary button-small"
            onClick={handleInstall}
            disabled={installing}
          >
            {installing ? (
              <span className="button-spinner" />
            ) : (
              <Download size={16} />
            )}
            Install
          </button>
          <button
            className="icon-button icon-button-small pwa-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
