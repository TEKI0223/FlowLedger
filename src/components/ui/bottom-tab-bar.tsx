"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3Icon, CirclePlusIcon, HomeIcon, ListIcon, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  {
    label: "首页",
    href: "/",
    icon: HomeIcon,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    label: "交易",
    href: "/transactions",
    icon: ListIcon,
    isActive: (pathname: string) =>
      pathname === "/transactions" ||
      pathname.startsWith("/transactions/recent") ||
      /^\/transactions\/[^/]+$/.test(pathname),
  },
  {
    label: "记一笔",
    href: "/entry",
    icon: CirclePlusIcon,
    isActive: (pathname: string) => pathname.startsWith("/entry"),
  },
  {
    label: "统计",
    href: "/stats",
    icon: BarChart3Icon,
    isActive: (pathname: string) => pathname.startsWith("/stats"),
  },
  {
    label: "管理",
    href: "/manage",
    icon: SettingsIcon,
    isActive: (pathname: string) =>
      pathname.startsWith("/manage") ||
      pathname.startsWith("/accounts") ||
      pathname.startsWith("/templates") ||
      pathname.startsWith("/recurring") ||
      pathname.startsWith("/refunds") ||
      pathname.startsWith("/installments") ||
      pathname.startsWith("/credit-cards"),
  },
];

export function BottomTabBar() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80 min-[820px]:hidden"
    >
      <div className="mx-auto grid min-h-[calc(4rem+env(safe-area-inset-bottom))] max-w-md grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active && "text-primary",
              )}
            >
              <Icon
                className={cn("size-5 transition-transform", active && "scale-105 stroke-[2.4]")}
              />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
