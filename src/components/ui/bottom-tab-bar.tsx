"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3Icon,
  CirclePlusIcon,
  HomeIcon,
  ListIcon,
  SettingsIcon,
  WalletCardsIcon,
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

  if (pathname === "/login") {
    return null;
  }

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80 min-[820px]:sticky min-[820px]:top-0 min-[820px]:bottom-auto min-[820px]:border-t-0 min-[820px]:border-b min-[820px]:shadow-sm"
    >
      <div className="mx-auto grid min-h-[calc(4rem+env(safe-area-inset-bottom))] max-w-md grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)] min-[820px]:flex min-[820px]:min-h-16 min-[820px]:max-w-6xl min-[820px]:items-center min-[820px]:justify-between min-[820px]:gap-6 min-[820px]:px-6 min-[820px]:pb-0">
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-2 rounded-md text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 min-[820px]:flex"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <WalletCardsIcon className="size-4" />
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
                  "flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 min-[820px]:h-10 min-[820px]:flex-row min-[820px]:gap-2 min-[820px]:px-3 min-[820px]:text-sm",
                  active && "bg-muted text-primary min-[820px]:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 transition-transform min-[820px]:size-4",
                    active && "scale-105 stroke-[2.4]",
                  )}
                />
                <span className="truncate">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
