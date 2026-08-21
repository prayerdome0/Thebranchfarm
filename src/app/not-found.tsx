import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <section className="page-shell not-found-panel">
      <span>404</span>
      <h1>We couldn&apos;t find that page.</h1>
      <p>The link may have moved or you typed an address that doesn&apos;t exist.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <Link href="/" className="button button-primary">
          <Compass size={18} /> Go to homepage
        </Link>
        <Link href="/shop" className="button button-secondary">
          <ArrowLeft size={18} /> Back to shop
        </Link>
      </div>
    </section>
  );
}
