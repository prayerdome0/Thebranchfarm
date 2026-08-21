import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "**.firebasestorage.app" },
      // Cloudinary — product photos and business paperwork (unsigned branch_farm preset).
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  typescript: { ignoreBuildErrors: false },
  poweredByHeader: false,
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
        ],
      },
    ];
  },
};

export default nextConfig;
