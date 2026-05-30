import type { Metadata } from "next";
import { DesktopShell } from "./desktop-shell";

export const metadata: Metadata = {
  title: "桌面工作台 | FlowLedger",
};

export default function DesktopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <DesktopShell>{children}</DesktopShell>;
}
