import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowLedger",
    short_name: "FlowLedger",
    description: "Personal finance dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#f6f1e8",
    orientation: "portrait-primary"
  };
}

