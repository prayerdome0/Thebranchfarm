import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/gallery", "/videos", "/about", "/our-farm", "/contact", "/offline"],
        disallow: [
          "/dashboard",
          "/orders",
          "/animals",
          "/health",
          "/staff",
          "/documents",
          "/activity",
          "/products",
          "/settings",
          "/videos/manage",
          "/customers",
          "/feed",
          "/inventory",
          "/milk-production",
          "/egg-production",
          "/daily-log",
          "/breeding",
          "/births",
          "/weights",
          "/movements",
          "/acquisitions",
          "/equipment",
          "/maintenance",
          "/expenses",
          "/incidents",
          "/tasks",
          "/audit",
          "/reports",
          "/guide",
          "/api/",
          "/_next/",
          "/media/videos/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/shop", "/gallery", "/videos", "/about", "/our-farm"],
        disallow: ["/dashboard", "/api/", "/_next/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
