import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LivrCheck",
    short_name: "LivrCheck",
    description: "Liver health check, daily habits and liver guide",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f8f6",
    theme_color: "#1f5e55",
    icons: [
      { src: "/icons/Icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/Icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
