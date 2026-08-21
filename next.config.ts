import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // NOTE: X-Frame-Options / CSP frame-ancestors intentionally omitted —
          // a DENY/SAMEORIGIN policy blocks the app from rendering inside the
          // sandboxed live-preview iframe (host: *.e2b.app), which surfaces as
          // "This page couldn't load" in the browser.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // NOTE: Cross-Origin-Opener-Policy intentionally omitted — "same-origin"
          // forces the document into an isolated browsing context group that breaks
          // iframe embedding and surfaces as "This page couldn't load".
        ],
      },
    ];
  },
};

export default nextConfig;
