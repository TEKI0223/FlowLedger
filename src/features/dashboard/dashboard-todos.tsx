"use client";

import Link from "next/link";
import { useState } from "react";
import { BellIcon, ChevronDownIcon, ChevronUpIcon, ReceiptIcon, RepeatIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DashboardTodosProps = {
  pendingRecurringCount: number;
  pendingRefundCount: number;
};

const todoStyles = {
  recurring: {
    icon: RepeatIcon,
    label: "周期项",
    href: "/recurring/pending",
    activeClass: "border-adjustment/30 bg-adjustment/5 text-adjustment",
  },
  refund: {
    icon: ReceiptIcon,
    label: "退款",
    href: "/refunds",
    activeClass: "border-transfer/30 bg-transfer/5 text-transfer",
  },
};

export function DashboardTodos({ pendingRecurringCount, pendingRefundCount }: DashboardTodosProps) {
  const hasTodos = pendingRecurringCount > 0 || pendingRefundCount > 0;
  const [open, setOpen] = useState(false);
  const allItems = [
    {
      key: "recurring",
      count: pendingRecurringCount,
      ...todoStyles.recurring,
    },
    {
      key: "refund",
      count: pendingRefundCount,
      ...todoStyles.refund,
    },
  ];
  const visibleItems = open ? allItems : allItems.filter((item) => item.count > 0);
  const ToggleIcon = open ? ChevronUpIcon : ChevronDownIcon;

  return (
    <section aria-label="待办">
      <Card size="sm">
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <BellIcon className="size-4 text-muted-foreground" />
              待办
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {hasTodos ? `${pendingRecurringCount + pendingRefundCount} 项` : "无待办"}
              <ToggleIcon className="size-3.5" />
            </span>
          </button>

          {!hasTodos && !open ? null : (
            <div className="grid gap-2">
              {visibleItems.map((item) => (
                <TodoRow
                  key={item.key}
                  href={item.href}
                  label={item.label}
                  count={item.count}
                  icon={item.icon}
                  activeClass={item.activeClass}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function TodoRow({
  href,
  label,
  count,
  icon: Icon,
  activeClass,
}: {
  href: string;
  label: string;
  count: number;
  icon: typeof RepeatIcon;
  activeClass: string;
}) {
  const active = count > 0;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted/50",
        active && activeClass,
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4" />
        <span>{label}</span>
      </span>
      <span className={cn("font-semibold tabular-nums", !active && "text-muted-foreground")}>
        {count}
      </span>
    </Link>
  );
}
