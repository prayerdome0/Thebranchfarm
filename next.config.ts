import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
    // Vercel handles optimization; unoptimized fallback prevents crash if image loader missing.
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
  // Ensure Vercel serves static correctly; no basePath/assetPrefix mismatch that causes chunk 404 -> "couldn't load".
  trailingSlash: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // NOTE: X-Frame-Options / CSP frame-ancestors intentionally omitted —
          // a DENY/SAMEORIGIN policy blocks the app from rendering inside the
          // sandboxed live-preview iframe (host: *.e2b.app) and on Vercel preview
          // deployments, which surfaces as "This page couldn't load" in the browser.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // NOTE: Cross-Origin-Opener-Policy intentionally omitted — "same-origin"
          // forces the document into an isolated browsing context group that breaks
          // iframe embedding and surfaces as "This page couldn't load".
          // X-DNS-Prefetch-Control and other Vercel defaults are left to Vercel.
        ],
      },
    ];
  },
};

export default nextConfig;
