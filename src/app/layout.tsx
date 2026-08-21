import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://thebranchfarm.com"),
  title: {
    default: "The Branch Farm — Farm Management",
    template: "%s · The Branch Farm",
  },
  description:
    "Farm management for The Branch Farm, Eswatini: livestock and animal records, animal health, staff, farm documents, activity, a public farm shop and settings.",
  applicationName: "The Branch Farm",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "The Branch Farm" },
  formatDetection: { telephone: true },
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
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <main id="main-content">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
