import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Branch Farm",
    short_name: "Branch Farm",
    description:
      "Farm-fresh produce and livestock from The Branch Farm, Mahlabane, Eswatini.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c281d",
    theme_color: "#153c2d",
    icons: [
      { src: "/logo.png", sizes: "any", type: "image/png" },
    ],
  };
}
