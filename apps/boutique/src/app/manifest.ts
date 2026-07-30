import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hive Partners",
    short_name: "Hive Partners",
    description: "Manage your boutique orders, inventory, and analytics.",
    start_url: "/boutique",
    id: "/boutique",
    display: "standalone",
    orientation: "any",
    background_color: "#F5C22B",
    theme_color: "#F5C22B",
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
