"use client";

import { useCallback } from "react";

export function OfflineRetryButton() {
  const handleRetry = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  return (
    <button
      className="button button-ghost offline-retry"
      onClick={handleRetry}
      type="button"
    >
      Try Again
    </button>
  );
}
