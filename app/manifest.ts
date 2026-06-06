import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NATS Accounting",
    short_name: "NATS",
    description: "Accounting, POS, inventory, and customer tracking app",
    start_url: "/id/pos",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#1c1917",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
