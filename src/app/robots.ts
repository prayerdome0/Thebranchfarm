import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/dashboard", "/orders", "/animals", "/health", "/staff", "/documents", "/activity", "/products", "/settings", "/videos/manage", "/api/"] },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
