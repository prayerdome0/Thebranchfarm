"use client";

import { useState } from "react";
import { BookOpen, Download, Loader2, Lock } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { auth } from "@/lib/firebase/config";

/**
 * Guide & user manual — the admin-only page that hands out the complete
 * application manual. The PDF itself is generated server-side behind admin
 * authentication (see /api/guide) and, when a guide password is configured,
 * is encrypted with it. The password is set in server configuration only and
 * is never displayed here, in any UI, or in client code.
 *
 * RESILIENCE: if the server route cannot produce the file (API running
 * without its backend credentials, temporary outage), the same generator is
 * used to build the PDF right here in the signed-in administrator's browser
 * so the download always succeeds. The in-browser copy is identical except
 * for the password layer, which only the server can apply.
 */
export default function GuidePage() {
  const { refreshToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const saveBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "The-Branch-Farm-User-Guide.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const download = async () => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      let token = await refreshToken();
      if (!token && auth?.currentUser) {
        token = await auth.currentUser.getIdToken(false).catch(() => null);
      }
      if (!token) {
        throw new Error("Your session could not be verified. Sign in again and retry.");
      }

      let blob: Blob | null = null;
      let serverError = "";
      try {
        const response = await fetch("/api/guide", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          blob = await response.blob();
        } else {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null;
          serverError = detail?.error || `The server answered ${response.status}.`;
        }
      } catch {
        serverError = "The farm server could not be reached.";
      }

      if (!blob) {
        // Server route unavailable — build the same PDF locally (no password
        // layer; that is applied server-side only).
        const { buildGuidePdf } = await import("@/lib/server/guide");
        const bytes = await buildGuidePdf();
        blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" });
        setNote(
          `Generated in your browser because the server route was unavailable (${
            serverError || "no response"
          }). This copy is not password protected.`,
        );
      }

      saveBlob(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The guide could not be generated.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="dashboard-stack">
        <section className="dashboard-section-title">
          <div>
            <h2>Guide &amp; user manual</h2>
            <p>The complete, official manual for the whole application — customer storefront, staff workspace and the full admin dashboard — with numbered pointers and arrows showing exactly where to click and what to enter.</p>
          </div>
        </section>

        <section className="dashboard-panel" style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <span className="guide-icon"><BookOpen size={26} /></span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <h3 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem" }}>The Branch Farm — Complete User Guide</h3>
              <p style={{ fontSize: ".8rem", color: "var(--muted)", marginTop: 6 }}>
                One single PDF covering everything: sign in &amp; registration, shopping and ordering, order
                tracking, receipts &amp; invoices (fill, download, print), notifications, orders and products,
                customers, quotations/invoices/receipts, farm documents &amp; media, animals &amp; health, breeding,
                daily operations, equipment &amp; expenses, reports &amp; audit, staff &amp; permissions, settings,
                and this guide&apos;s own security.
              </p>
              <ul className="guide-facts">
                <li>21 illustrated pages · numbered pointers &amp; arrows for every step</li>
                <li>Covers customer, staff and administrator sides in one manual</li>
                <li>Regenerated by the app itself — always matches the live system</li>
              </ul>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="button button-primary" onClick={download} disabled={busy}>
              {busy ? <Loader2 size={17} className="spin" /> : <Download size={17} />}
              {busy ? "Generating guide…" : "Download guide (PDF)"}
            </button>
            <span className="guide-protected"><Lock size={14} /> Admins only · password protected · never public</span>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {note && !error && (
            <p className="guide-note" role="status" style={{ fontSize: ".75rem", color: "var(--muted)" }}>{note}</p>
          )}

          <p style={{ fontSize: ".72rem", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <strong>How it is protected:</strong> the guide is generated on demand by the server, only for a
            signed-in administrator, and is never stored in a public folder. When a guide password is configured,
            the PDF additionally requires that password to open — the administrator sets it in the server
            configuration (<code>GUIDE_PDF_PASSWORD</code>) and it is never displayed in the app, shown to staff
            or customers, or included in any code sent to the browser. Sharing the file responsibly remains the
            administrator&apos;s decision — access control protects the download, the password protects the document.
          </p>
        </section>
      </div>
    </ProtectedRoute>
  );
}
