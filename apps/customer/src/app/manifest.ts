import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hive Marketplace",
    short_name: "Hive",
    description: "Discover fashion from boutiques, brands and designers across Kochi and Ernakulam. Delivered in 90 minutes.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#d4af37",
    theme_color: "#d4af37",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
