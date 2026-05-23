import Link from "next/link";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ManageExportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <Link
            href="/manage"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            管理
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">数据导出</h1>
          <p className="text-sm text-muted-foreground">交易与账户 CSV 导出会在 S2.3 接入。</p>
        </div>
      </header>

      <Card>
        <CardContent className="flex min-h-44 flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <DownloadIcon className="size-6" />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            这里会提供本月和全部数据两个导出范围。
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
