import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLedger",
  description: "Personal finance dashboard",
  applicationName: "FlowLedger",
  appleWebApp: {
    capable: true,
    title: "FlowLedger",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#f6f1e8",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

