import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com"),
  title: {
    default: `${BUSINESS.name} — ${BUSINESS.slogan} | The Branch Farm Eswatini`,
    template: `%s · ${BUSINESS.name} · ${BUSINESS.slogan}`,
  },
  description: `${BUSINESS.name} — ${BUSINESS.slogan}. Fresh farm eggs, milk, emasi, vegetables and livestock from Mahlabane, Eswatini. Farm products in Eswatini, Manzini, Matsapha. ${BUSINESS.deliveryFree} ${BUSINESS.deliveryOther}`,
  applicationName: `${BUSINESS.name} - ${BUSINESS.slogan}`,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: `${BUSINESS.name}` },
  formatDetection: { telephone: true },
  keywords: ["The Branch Farm Eswatini", "Nayi Plug", "farm products in Eswatini", "farm products Manzini", "fresh farm products Eswatini"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#153c2d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a className="skip-link" href="#main-content">Skip to content</a>
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
