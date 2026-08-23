import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  const manifestData = {
    name: `${BUSINESS.name} - ${BUSINESS.slogan}`,
    short_name: BUSINESS.name,
    description: `${BUSINESS.name} - ${BUSINESS.slogan}. Fresh farm eggs, milk, emasi, vegetables and livestock from Mahlabane, Eswatini. Free delivery Manzini & Matsapha. Order online, track orders, manage farm operations offline.`,
    start_url: "/?utm_source=pwa",
    scope: "/",
    id: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "browser"],
    orientation: "any",
    background_color: "#0c281d",
    theme_color: "#153c2d",
    lang: "en",
    dir: "ltr",
    categories: ["shopping", "food", "business", "agriculture", "lifestyle"],
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
    handle_links: "preferred",
    edge_side_panel: {
      preferred_width: 400,
    },
    icons: [
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-256x256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/logo.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
    screenshots: [
      {
        src: "/media/farm-hero.jpg",
        sizes: "1200x630",
        type: "image/jpeg",
        form_factor: "wide",
        label: "The Branch Farm — Fresh produce from Mahlabane, Eswatini",
      },
      {
        src: "/media/vegetable-garden.jpg",
        sizes: "1200x800",
        type: "image/jpeg",
        form_factor: "narrow",
        label: "Fresh vegetables and farm produce",
      },
    ],
    shortcuts: [
      {
        name: "Shop Fresh Produce",
        short_name: "Shop",
        description: "Browse fresh eggs, milk, emasi and vegetables",
        url: "/shop?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Track Order",
        short_name: "Track",
        description: "Track your order by reference",
        url: "/track?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Our Farm",
        short_name: "Farm",
        description: "Learn about The Branch Farm",
        url: "/our-farm?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Farm Dashboard",
        short_name: "Dashboard",
        description: "Staff farm operations dashboard",
        url: "/dashboard?utm_source=pwa_shortcut",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    share_target: {
      action: "/shop",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    file_handlers: [
      {
        action: "/media",
        accept: {
          "image/*": [".jpg", ".jpeg", ".png", ".webp"],
          "video/*": [".mp4", ".webm"],
        },
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };

  return manifestData as unknown as MetadataRoute.Manifest;
}
