import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Open Bible Reader",
    short_name: "BibleReader",
    description: "Застосунок на Next.js, який можна завантажити.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#155dfc",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
