"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[TheBranchFarm] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <section
          className="page-shell"
          style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              padding: "42px",
              textAlign: "center",
              background: "#fff",
              border: "1px solid #dde3dd",
              borderRadius: 28,
              boxShadow: "0 32px 80px rgba(8,30,20,.19)",
            }}
          >
            <span
              style={{
                width: 66,
                height: 66,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 20px",
                color: "#a33b32",
                background: "#fde9e7",
                borderRadius: "50%",
              }}
            >
              <AlertTriangle size={30} />
            </span>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.1rem", color: "#17241e" }}>
              The farm site hit a snag.
            </h1>
            <p style={{ margin: "12px 0 26px", color: "#68736c" }}>
              Please reload. If it persists, open the homepage — your farm records are still safe in
              Firebase.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  minHeight: 52,
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: 0,
                  background: "#1f553c",
                  color: "#fff",
                  fontWeight: 750,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <RefreshCcw size={18} /> Try again
              </button>
              <button
                onClick={() => window.location.replace("/")}
                style={{
                  minHeight: 52,
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: "1px solid #cdd7d0",
                  background: "#fff",
                  color: "#123528",
                  fontWeight: 750,
                  cursor: "pointer",
                }}
              >
                Go to homepage
              </button>
            </div>
          </div>
        </section>
      </body>
    </html>
  );
}
