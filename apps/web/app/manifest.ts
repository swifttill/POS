import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return {
    name: "SwiftTill POS",
    short_name: "SwiftTill",
    description: "Ultra-fast restaurant point-of-sale.",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: `${base}/icon.svg`,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
