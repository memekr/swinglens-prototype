import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SwingLens — On-device swing review",
    short_name: "SwingLens",
    description: "A local-first baseball swing review prototype for phone video.",
    start_url: "/",
    display: "standalone",
    background_color: "#07110d",
    theme_color: "#c9ff52",
    orientation: "any",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
