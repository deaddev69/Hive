import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hive Seller Dashboard",
    short_name: "Hive Seller",
    description: "Manage your boutique orders, inventory, and analytics.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#121212",
    theme_color: "#121212",
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
