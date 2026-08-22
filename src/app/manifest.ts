import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/constants";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BUSINESS.name} - ${BUSINESS.slogan}`,
    short_name: BUSINESS.name,
    description: `${BUSINESS.name} - ${BUSINESS.slogan}. Fresh farm eggs, milk, emasi, vegetables and livestock from Mahlabane, Eswatini. Free delivery Manzini & Matsapha.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0c281d",
    theme_color: "#153c2d",
    icons: [{ src: "/logo.png", sizes: "any", type: "image/png" }],
  };
}
