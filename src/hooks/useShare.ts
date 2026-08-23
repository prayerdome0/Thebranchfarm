"use client";

import { useCallback, useState } from "react";
import { shareContent, isShareSupported } from "@/lib/pwa";
import { useToast } from "@/contexts/ToastContext";

export function useShare() {
  const [sharing, setSharing] = useState(false);
  const { showToast } = useToast();

  const share = useCallback(
    async (data: ShareData) => {
      if (!isShareSupported()) {
        // Fallback to clipboard
        try {
          if (data.url && navigator.clipboard) {
            await navigator.clipboard.writeText(data.url);
            showToast("Link copied to clipboard", "success");
            return true;
          }
        } catch {
          /* ignore */
        }
        return false;
      }

      setSharing(true);
      try {
        const result = await shareContent(data);
        return result;
      } catch {
        return false;
      } finally {
        setSharing(false);
      }
    },
    [showToast]
  );

  return { share, sharing, isSupported: isShareSupported() };
}
