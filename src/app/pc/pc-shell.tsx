"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  BarChart3Icon,
  BellIcon,
  CirclePlusIcon,
  CreditCardIcon,
  FolderTreeIcon,
  HomeIcon,
  LayersIcon,
  ListIcon,
  MoonIcon,
  MousePointerClickIcon,
  ReceiptIcon,
  RepeatIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
  WalletIcon,
  ZapIcon,
} from "lucide-react";
import { LogoutButton } from "@/app/logout-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "总览", href: "/", icon: HomeIcon },
  { label: "交易", href: "/transactions", icon: ListIcon },
  { label: "账户", href: "/accounts", icon: WalletIcon },
  { label: "信用卡", href: "/credit-cards", icon: CreditCardIcon },
  { label: "周期项目", href: "/recurring", icon: RepeatIcon },
  { label: "退款", href: "/refunds", icon: ReceiptIcon },
  { label: "分期", href: "/installments", icon: LayersIcon },
  { label: "统计", href: "/stats", icon: BarChart3Icon },
  { label: "分类", href: "/categories", icon: FolderTreeIcon },
  { label: "模板", href: "/templates", icon: ZapIcon },
  { label: "支付方式", href: "/manage/payment-methods", icon: MousePointerClickIcon },
  { label: "汇率", href: "/manage/rates", icon: SettingsIcon },
];

export function PCShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-muted/35 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-background/95 px-3 py-4 shadow-sm backdrop-blur xl:flex">
        <Link
          href="/"
          className="mb-5 flex h-11 items-center gap-3 rounded-lg px-2 text-sm font-semibold tracking-tight hover:bg-muted"
        >
          <span className="flex size-9 items-center justify-center rounded-lg border border-border bg-white p-1.5">
            <Image
              src="/icons/app-icon.png"
              alt=""
              width={24}
              height={24}
              className="size-6"
              unoptimized
            />
          </span>
          <span>FlowLedger Desktop</span>
        </Link>

        <nav aria-label="桌面导航" className="grid gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted font-medium text-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 xl:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
          <div className="flex h-14 items-center gap-3 px-4 md:px-6">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-sm font-semibold xl:hidden"
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
              <span>Desktop</span>
            </Link>
            <PCSearch />
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/entry"
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "hidden md:inline-flex",
                })}
              >
                <ZapIcon className="size-3.5" />
                快捷记账
              </Link>
              <Link href="/entry" className={buttonVariants({ size: "sm" })}>
                <CirclePlusIcon className="size-3.5" />
                新建交易
              </Link>
              <ThemeToggle />
              <Link
                href="/"
                aria-label="待办"
                className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
              >
                <BellIcon className="size-4" />
              </Link>
              <div className="hidden md:block">
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function PCSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  const action = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    const suffix = params.toString();
    return suffix ? `/transactions?${suffix}` : "/transactions";
  }, [query, searchParams]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(action);
      }}
      className="relative hidden min-w-0 flex-1 md:block"
    >
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="搜索近期交易、账户、分类、备注"
        className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
      />
    </form>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const Icon = isDark ? SunIcon : MoonIcon;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Icon className="size-4" />
    </Button>
  );
}
