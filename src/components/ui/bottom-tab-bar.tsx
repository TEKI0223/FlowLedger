"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CirclePlusIcon,
  HomeIcon,
  ListIcon,
  SettingsIcon,
} from "lucide-react";
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

  return (
    <nav
      aria-label="主导航"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-border/60 bg-background",
        "supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
        "min-[820px]:sticky min-[820px]:bottom-auto min-[820px]:top-0",
        "min-[820px]:border-t-0 min-[820px]:border-b",
        "min-[820px]:bg-background/95 min-[820px]:shadow-sm",
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-md grid-cols-5 gap-0.5 px-1.5 pt-1.5",
          "pb-[max(0.375rem,env(safe-area-inset-bottom))]",
          "min-[820px]:flex min-[820px]:h-16 min-[820px]:max-w-6xl",
          "min-[820px]:items-center min-[820px]:justify-between min-[820px]:gap-6",
          "min-[820px]:px-6 min-[820px]:pt-0 min-[820px]:pb-0",
        )}
      >
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 min-[820px]:flex"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-white p-1">
            <Image
              src="/icons/app-icon.png"
              alt=""
              width={24}
              height={24}
              className="size-6"
              unoptimized
            />
          </span>
          <span>FlowLedger</span>
        </Link>

        <div className="contents min-[820px]:flex min-[820px]:items-center min-[820px]:gap-1">
          {tabs.map((tab) => {
            const active = tab.isActive(pathname);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg",
                  "px-1 py-1 text-[10px] font-medium transition-colors",
                  "text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  active ? "text-foreground" : "hover:text-foreground/80",
                  "min-[820px]:h-10 min-[820px]:flex-row min-[820px]:gap-2 min-[820px]:px-3 min-[820px]:text-sm",
                  active && "min-[820px]:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "size-6 shrink-0 transition-transform",
                    active && "stroke-[2.4]",
                    "min-[820px]:size-4",
                  )}
                />
                <span className="truncate leading-none">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
