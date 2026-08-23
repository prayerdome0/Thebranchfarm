import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com"
  ),
  title: {
    default: `${BUSINESS.name} — ${BUSINESS.slogan} | The Branch Farm Eswatini`,
    template: `%s · ${BUSINESS.name} · ${BUSINESS.slogan}`,
  },
  description: `${BUSINESS.name} — ${BUSINESS.slogan}. Fresh farm eggs, milk, emasi, vegetables and livestock from Mahlabane, Eswatini. Farm products in Eswatini, Manzini, Matsapha. ${BUSINESS.deliveryFree} ${BUSINESS.deliveryOther}`,
  applicationName: `${BUSINESS.name} - ${BUSINESS.slogan}`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "any", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/favicon-32x32.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BUSINESS.name,
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)",
      },
    ],
  },
  formatDetection: { telephone: true },
  keywords: [
    "The Branch Farm Eswatini",
    "Nayi Plug",
    "farm products in Eswatini",
    "farm products Manzini",
    "fresh farm products Eswatini",
    "PWA",
    "farm management",
    "offline farm app",
  ],
  openGraph: {
    type: "website",
    siteName: BUSINESS.name,
    title: `${BUSINESS.name} — ${BUSINESS.slogan}`,
    description: `${BUSINESS.name} — Fresh farm eggs, milk, emasi, vegetables and livestock from Mahlabane, Eswatini. Free delivery Manzini & Matsapha.`,
    images: [
      {
        url: "/media/farm-hero.jpg",
        width: 1200,
        height: 630,
        alt: `${BUSINESS.name} farm`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS.name} — ${BUSINESS.slogan}`,
    description: "Fresh farm products in Eswatini — eggs, milk, emasi, vegetables and livestock",
    images: ["/media/farm-hero.jpg"],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#0c281d",
    "msapplication-TileImage": "/icons/icon-144x144.png",
    "msapplication-config": "none",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#153c2d" },
    { media: "(prefers-color-scheme: dark)", color: "#0c281d" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <head>
        {/* PWA — iOS splash and additional meta */}
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/apple-touch-icon.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="152x152"
          href="/icons/icon-152x152.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/icons/icon-144x144.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="128x128"
          href="/icons/icon-128x128.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/favicon-16x16.png"
        />
        <link rel="mask-icon" href="/logo.png" color="#153c2d" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Branch Farm" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Branch Farm" />
        <meta name="msapplication-TileColor" content="#0c281d" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=yes" />
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
      </head>
      <body>
        <Providers>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <main id="main-content">{children}</main>
        </Providers>
        {/* PWA — no-js fallback */}
        <noscript>
          <style>{` .pwa-install-prompt,.pwa-update-prompt,.offline-indicator{display:none!important}`}</style>
          <div style={{padding:'12px',background:'#fff8e7',textAlign:'center',fontSize:'.8rem'}}>
            JavaScript is disabled — some features like offline access and cart may not work. Please enable JavaScript for the best experience.
          </div>
        </noscript>
      </body>
    </html>
  );
}
