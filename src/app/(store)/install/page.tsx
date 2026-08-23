import type { Metadata } from "next";
import { Download, Smartphone, WifiOff, Bell, ShoppingBag, Zap, Shield } from "lucide-react";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Install App — ${BUSINESS.name}`,
  description: `Install ${BUSINESS.name} app for offline access, faster shopping and farm management on the go.`,
};

export default function InstallPage() {
  return (
    <div className="page-shell" style={{ maxWidth: 800 }}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">PWA • Progressive Web App</span>
          <h1>Install The Branch Farm App</h1>
          <p>
            Add The Branch Farm to your home screen for offline access, faster loading,
            and a native app-like experience. No app store needed — install directly from your browser.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 24, marginTop: 32 }}>
        <div className="dashboard-panel">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <span style={{ width: 44, height: 44, display: "grid", placeItems: "center", background: "#e8f3eb", borderRadius: 10, color: "#2a6d4c" }}>
              <Smartphone size={22} />
            </span>
            <div>
              <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.1rem" }}>How to Install</h2>
              <p style={{ fontSize: ".8rem", marginTop: 2 }}>Takes 5 seconds, works on all devices</p>
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem" }}>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", background: "#1f553c", color: "#fff", borderRadius: "50%", fontSize: ".7rem" }}>1</span>
                Android / Chrome
              </strong>
              <ul style={{ margin: "8px 0 0 32px", fontSize: ".82rem", color: "var(--muted)", display: "grid", gap: 4 }}>
                <li>Open <strong>thebranchfarm.com</strong> in Chrome</li>
                <li>Tap the <strong>⋮ menu</strong> (top right) → <strong>Add to Home screen</strong> or <strong>Install app</strong></li>
                <li>Or use the install banner that appears automatically</li>
              </ul>
            </div>

            <div>
              <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem" }}>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", background: "#1f553c", color: "#fff", borderRadius: "50%", fontSize: ".7rem" }}>2</span>
                iPhone / iPad (Safari)
              </strong>
              <ul style={{ margin: "8px 0 0 32px", fontSize: ".82rem", color: "var(--muted)", display: "grid", gap: 4 }}>
                <li>Open in Safari</li>
                <li>Tap the <strong>Share button</strong> (square with arrow)</li>
                <li>Scroll and tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong></li>
              </ul>
            </div>

            <div>
              <strong style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".85rem" }}>
                <span style={{ width: 24, height: 24, display: "grid", placeItems: "center", background: "#1f553c", color: "#fff", borderRadius: "50%", fontSize: ".7rem" }}>3</span>
                Desktop (Chrome, Edge)
              </strong>
              <ul style={{ margin: "8px 0 0 32px", fontSize: ".82rem", color: "var(--muted)", display: "grid", gap: 4 }}>
                <li>Look for the <strong>Install icon</strong> in the address bar</li>
                <li>Or menu → <strong>Install The Branch Farm</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="dashboard-panel">
          <h2 style={{ fontFamily: "var(--sans)", fontSize: "1.05rem", marginBottom: 16 }}>Why Install?</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            <Feature icon={<Zap size={18} />} title="Faster" desc="Loads instantly, works offline, cached products" />
            <Feature icon={<WifiOff size={18} />} title="Offline Access" desc="Browse cached products and cart without internet" />
            <Feature icon={<ShoppingBag size={18} />} title="Easy Shopping" desc="Home screen access, quick checkout, order tracking" />
            <Feature icon={<Bell size={18} />} title="Updates" desc="Get notified about order status and farm updates" />
            <Feature icon={<Shield size={18} />} title="Secure" desc="Same security as website, no extra permissions" />
            <Feature icon={<Download size={18} />} title="Lightweight" desc="Less than 1MB, no app store, auto-updates" />
          </div>
        </div>

        <div className="dashboard-panel" style={{ background: "#0c281d", color: "#dbe6de", borderColor: "#0c281d" }}>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", color: "#fff" }}>App Features</h2>
          <ul style={{ marginTop: 12, display: "grid", gap: 8, fontSize: ".84rem", color: "#abbcb0", listStyle: "none", padding: 0 }}>
            <li>✓ Offline product browsing (previously visited items cached)</li>
            <li>✓ Cart saved locally — never lose your order</li>
            <li>✓ Order tracking even with poor connection</li>
            <li>✓ Farm operations dashboard for staff (offline-capable)</li>
            <li>✓ Fast image loading with smart caching</li>
            <li>✓ Share products via native share sheet</li>
            <li>✓ Add to home screen badge with cart count</li>
            <li>✓ Automatic updates when online</li>
          </ul>
        </div>

        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ fontSize: ".82rem" }}>Already installed? Open the app from your home screen.</p>
          <p style={{ fontSize: ".72rem", marginTop: 6, color: "var(--muted)" }}>
            PWA version 2.0 • Works on Android, iOS, Windows, macOS, Linux • No app store required
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ width: 36, height: 36, display: "grid", placeItems: "center", background: "#f0f5ef", borderRadius: 8, color: "#2a6d4c", flex: "0 0 auto" }}>
        {icon}
      </span>
      <div style={{ display: "grid", gap: 2 }}>
        <strong style={{ fontSize: ".82rem" }}>{title}</strong>
        <small style={{ fontSize: ".72rem", color: "var(--muted)" }}>{desc}</small>
      </div>
    </div>
  );
}
