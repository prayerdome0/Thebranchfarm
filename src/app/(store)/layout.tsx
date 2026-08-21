import type { Metadata } from "next";
import { SiteFooter } from "@/components/store/SiteFooter";
import { SiteHeader } from "@/components/store/SiteHeader";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} — Farm-fresh produce & livestock`,
    template: `%s · ${BUSINESS.name}`,
  },
  description:
    "Order farm-fresh eggs, milk, vegetables and healthy livestock direct from The Branch Farm, Mahlabane, Eswatini. Collect at the farm or arrange delivery — pay on collection.",
  openGraph: {
    title: `${BUSINESS.name} — Farm-fresh produce & livestock`,
    description:
      "Order farm-fresh produce and healthy livestock direct from The Branch Farm, Eswatini.",
    siteName: BUSINESS.name,
    locale: "en_SZ",
    type: "website",
    images: ["/media/farm-hero.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} — Farm-fresh produce & livestock`,
    description: "Order farm-fresh produce and livestock direct from the farm.",
    images: ["/media/farm-hero.jpg"],
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Farm",
  name: BUSINESS.name,
  slogan: BUSINESS.slogan,
  telephone: BUSINESS.phoneDisplay,
  address: {
    "@type": "PostalAddress",
    streetAddress: "GG67+P95 Mahlabane",
    addressCountry: "SZ",
  },
  areaServed: "Eswatini",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
