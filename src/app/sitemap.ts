import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://thebranchfarm.com";
  const now = new Date();

  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/shop", changeFrequency: "daily", priority: 0.9 },
    { path: "/our-farm", changeFrequency: "monthly", priority: 0.8 },
    { path: "/gallery", changeFrequency: "weekly", priority: 0.7 },
    { path: "/videos", changeFrequency: "weekly", priority: 0.7 },
    { path: "/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
    { path: "/cart", changeFrequency: "weekly", priority: 0.5 },
    { path: "/checkout", changeFrequency: "weekly", priority: 0.5 },
    { path: "/track", changeFrequency: "weekly", priority: 0.6 },
    { path: "/offline", changeFrequency: "yearly", priority: 0.1 },
    { path: "/login", changeFrequency: "monthly", priority: 0.3 },
    { path: "/register", changeFrequency: "monthly", priority: 0.3 },
    { path: "/account", changeFrequency: "weekly", priority: 0.4 },
  ];

  return staticPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
