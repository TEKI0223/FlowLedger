import type { Metadata } from "next";
import { PCShell } from "./pc-shell";

export const metadata: Metadata = {
  title: "桌面工作台 | FlowLedger",
};

export default function PCLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PCShell>{children}</PCShell>;
}
