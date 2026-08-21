"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring if needed — never throw again here.
    console.error("[TheBranchFarm] page error:", error);
  }, [error]);

  const isChunkLoad =
    /ChunkLoadError|Loading chunk|failed to fetch dynamically imported module/i.test(
      error.message
    );

  return (
    <section className="page-shell" style={{ display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: "min(560px, 100%)",
          padding: "42px",
          textAlign: "center",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow)",
        }}
      >
        <span
          style={{
            width: 66,
            height: 66,
            display: "grid",
            placeItems: "center",
            margin: "0 auto 20px",
            color: "var(--danger)",
            background: "#fde9e7",
            borderRadius: "50%",
          }}
        >
          <AlertTriangle size={30} />
        </span>
        <span className="eyebrow" style={{ justifyContent: "center" }}>
          {isChunkLoad ? "Update available" : "Something went wrong"}
        </span>
        <h1 style={{ fontSize: "2.1rem" }}>
          {isChunkLoad ? "A new version is available." : "We couldn't load this page."}
        </h1>
        <p style={{ margin: "12px 0 26px" }}>
          {isChunkLoad
            ? "Your browser cached an older version. Reload to get the latest."
            : "Please try again. If the problem continues, return home or contact the farm."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="button button-primary" onClick={() => reset()}>
            <RefreshCcw size={18} /> Try again
          </button>
          <button
            className="button button-secondary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <Link href="/" className="button button-ghost">
            <ArrowLeft size={18} /> Back to home
          </Link>
        </div>
        {error.digest && (
          <small style={{ display: "block", marginTop: 18, color: "var(--muted)", fontSize: ".62rem" }}>
            Ref: {error.digest}
          </small>
        )}
      </div>
    </section>
  );
}
