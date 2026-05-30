import Link from "next/link";
import { ArrowRightIcon, MousePointerClickIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { paymentMethodTypeLabels } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { listPaymentMethods } from "@/features/payment-methods/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const paymentMethods = await listPaymentMethods();
  const enabledCount = paymentMethods.filter((method) => method.enabled).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex items-start justify-between gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">支付方式</h1>
          <p className="text-sm text-muted-foreground">
            {paymentMethods.length} 个支付方式 · {enabledCount} 个启用
          </p>
        </div>
        <Link
          href="/manage/payment-methods/new"
          className={cn(buttonVariants({ size: "sm" }), "h-8 shrink-0")}
        >
          <PlusIcon className="size-3.5" />
          新增
        </Link>
      </header>

      {paymentMethods.length === 0 ? (
        <Card size="sm" className="items-center px-4 py-8 text-center">
          <MousePointerClickIcon className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">还没有支付方式</p>
            <p className="text-xs text-muted-foreground">
              新增后可以在交易、模板和周期项目里选择。
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {paymentMethods.map((method) => (
            <Link
              key={method.id}
              href={`/manage/payment-methods/${method.id}`}
              className="block rounded-xl outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
            >
              <Card size="sm" className="px-4 py-3 transition-colors hover:bg-muted/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{method.name}</p>
                      <Badge variant="secondary">{paymentMethodTypeLabels[method.type]}</Badge>
                      <Badge variant={method.enabled ? "outline" : "destructive"}>
                        {method.enabled ? "启用" : "停用"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {method.defaultAccount
                        ? formatAccountName(method.defaultAccount)
                        : "未设置资金来源"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {method.currency}
                    </Badge>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
