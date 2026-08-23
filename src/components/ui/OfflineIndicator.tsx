"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineIndicator() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`offline-indicator ${!isOnline ? "offline" : "reconnected"}`}
      role="status"
      aria-live="polite"
    >
      {isOnline ? (
        <>
          <Wifi size={14} />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff size={14} />
          <span>You are offline — browsing cached content</span>
        </>
      )}
    </div>
  );
}
