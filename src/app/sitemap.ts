import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com";
  const staticPaths = [
    "",
    "/shop",
    "/videos",
    "/gallery",
    "/about",
    "/contact",
    "/cart",
    "/checkout",
    "/track",
    "/login",
    "/register",
  ];

  return staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/shop" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
