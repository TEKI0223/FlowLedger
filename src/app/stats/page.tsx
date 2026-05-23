import Link from "next/link";
import { ArrowLeftIcon, BarChart3Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            首页
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">统计</h1>
          <p className="text-sm text-muted-foreground">
            月度对比、分类排行和趋势视图会在 S2.4 接入。
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <BarChart3Icon className="size-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">统计页占位</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              底栏入口已就位，后续会在这里补齐 5 个核心分析视图。
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
