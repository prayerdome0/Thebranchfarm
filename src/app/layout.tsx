import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://thebranchfarm.com"),
  title: {
    default: "The Branch Farm | Nayi Plug",
    template: "%s | The Branch Farm",
  },
  description:
    "Fresh raw full-fat milk and sour milk from The Branch Farm in Eswatini. Order online, arrange delivery and track your order.",
  applicationName: "The Branch Farm",
  keywords: ["Eswatini farm", "fresh milk", "Ngculwini", "Manzini delivery", "Matsapha delivery"],
  openGraph: {
    title: "The Branch Farm — Nayi Plug",
    description: "Fresh from our farm. Straight to you.",
    images: ["/media/farm-hero.jpg"],
    type: "website",
  },
  icons: { icon: "/logo.png", apple: "/logo.png" },
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
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
