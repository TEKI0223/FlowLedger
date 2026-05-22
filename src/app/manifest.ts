import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FlowLedger",
    short_name: "FlowLedger",
    description: "Personal finance dashboard",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#f7f8fb",
    orientation: "portrait-primary",
  };
}
