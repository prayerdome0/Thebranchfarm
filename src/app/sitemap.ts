import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com";
  const staticPaths = [
    "",
    "/shop",
    "/our-farm",
    "/gallery",
    "/about",
    "/contact",
    "/cart",
    "/checkout",
    "/login",
    "/register",
  ];

  return staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/shop" ? "daily" : path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.7,
  }));
}
