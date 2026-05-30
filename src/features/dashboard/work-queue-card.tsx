import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  LayersIcon,
  ReceiptIcon,
  RepeatIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WorkQueueCard({
  pendingRecurring,
  pendingRefunds,
  cardReminders,
  activeInstallments,
  className,
}: {
  pendingRecurring: number;
  pendingRefunds: number;
  cardReminders: number;
  activeInstallments: number;
  className?: string;
}) {
  const rows = [
    {
      href: "/recurring/pending",
      icon: RepeatIcon,
      label: "周期项目待确认",
      count: pendingRecurring,
    },
    {
      href: "/refunds",
      icon: ReceiptIcon,
      label: "退款待到账",
      count: pendingRefunds,
    },
    {
      href: "/credit-cards",
      icon: CreditCardIcon,
      label: "信用卡账单未还",
      count: cardReminders,
    },
    {
      href: "/installments",
      icon: LayersIcon,
      label: "分期进行中",
      count: activeInstallments,
    },
  ];
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card className={cn("rounded-lg", className)}>
      <CardHeader className="border-b border-border">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>待办</span>
          <span className="text-xs font-normal text-muted-foreground">{total} 项</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {total === 0 ? (
          <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-income" />
            当前没有待处理事项。
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => {
              const Icon = row.icon;
              const dimmed = row.count === 0;
              return (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                      dimmed && "opacity-60",
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{row.label}</span>
                    <span className="text-sm font-semibold tabular-nums">{row.count}</span>
                    <ArrowRightIcon className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
