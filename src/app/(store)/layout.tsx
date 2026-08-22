import type { Metadata } from "next";
import { SiteFooter } from "@/components/store/SiteFooter";
import { SiteHeader } from "@/components/store/SiteHeader";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  title: {
    default: `${BUSINESS.name} — ${BUSINESS.slogan} | Farm Products Eswatini`,
    template: `%s · ${BUSINESS.name} · ${BUSINESS.slogan}`,
  },
  description:
    "The Branch Farm — Nayi Plug. Fresh farm eggs, milk, emasi, vegetables and healthy livestock from Mahlabane, Eswatini. Farm products in Eswatini, farm products Manzini, fresh farm products Eswatini. Free delivery around Manzini and Matsapha. Order online or WhatsApp.",
  keywords: [
    "The Branch Farm Eswatini",
    "farm products in Eswatini",
    "farm products Manzini",
    "fresh farm products Eswatini",
    "Nayi Plug",
    "farm eggs Eswatini",
    "fresh milk Eswatini",
    "emasi Eswatini",
    "livestock Eswatini",
  ],
  openGraph: {
    title: `${BUSINESS.name} — ${BUSINESS.slogan} | Farm Products Eswatini`,
    description:
      "Fresh farm products in Eswatini — eggs, milk, emasi, vegetables and livestock from The Branch Farm, Mahlabane. Free delivery around Manzini and Matsapha.",
    siteName: BUSINESS.name,
    locale: "en_SZ",
    type: "website",
    images: [{ url: "/media/farm-hero.jpg", width: 1200, height: 630, alt: `${BUSINESS.name} farm at Mahlabane` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} — ${BUSINESS.slogan}`,
    description: "Farm products in Eswatini — fresh eggs, milk, vegetables and livestock from Mahlabane. Free delivery Manzini & Matsapha.",
    images: ["/media/farm-hero.jpg"],
  },
  alternates: {
    canonical: "/",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Farm",
  name: BUSINESS.name,
  alternateName: BUSINESS.slogan,
  description: "Fresh farm products in Eswatini — eggs, milk, emasi, vegetables and livestock. Free delivery around Manzini and Matsapha.",
  telephone: BUSINESS.phoneDisplay,
  email: BUSINESS.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: "GG67+P95 Mahlabane",
    addressLocality: "Mahlabane",
    addressRegion: "Manzini",
    addressCountry: "SZ",
  },
  areaServed: ["Manzini", "Matsapha", "Eswatini"],
  slogan: BUSINESS.slogan,
  url: "https://thebranchfarm.com",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
