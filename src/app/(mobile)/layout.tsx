import { BottomTabBar } from "@/components/ui/bottom-tab-bar";

export default function MobileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <BottomTabBar />
      {children}
    </>
  );
}
