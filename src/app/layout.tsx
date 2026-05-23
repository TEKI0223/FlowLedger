import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { BottomTabBar } from "@/components/ui/bottom-tab-bar";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowLedger",
  description: "个人现金流与账户面板",
  applicationName: "FlowLedger",
  appleWebApp: {
    capable: true,
    title: "FlowLedger",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1c1c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BottomTabBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
