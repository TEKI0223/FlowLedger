"use client";

import { useMemo, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ISO = "YYYY-MM-DD";
const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export type CalendarProps = {
  /** YYYY-MM-DD */
  value?: string;
  /** YYYY-MM-DD upper bound（含），通常是今天，禁止选未来 */
  max?: string;
  /** YYYY-MM-DD lower bound（含） */
  min?: string;
  onSelect: (value: string) => void;
};

export function Calendar({ value, max, min, onSelect }: CalendarProps) {
  const today = dayjs();
  const todayStr = today.format(ISO);
  const initialView = value ? dayjs(value) : today;
  const [viewMonth, setViewMonth] = useState<Dayjs>(initialView.startOf("month"));

  const days = useMemo(() => buildCalendarDays(viewMonth), [viewMonth]);

  const maxDay = max ? dayjs(max) : null;
  const minDay = min ? dayjs(min) : null;

  function isDisabled(day: Dayjs) {
    if (maxDay && day.isAfter(maxDay, "day")) return true;
    if (minDay && day.isBefore(minDay, "day")) return true;
    return false;
  }

  return (
    <div className="grid w-[18rem] gap-2 select-none">
      <div className="flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          onClick={() => setViewMonth((m) => m.subtract(1, "month"))}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="上一月"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-sm font-medium tabular-nums">
          {viewMonth.format("YYYY 年 M 月")}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth((m) => m.add(1, "month"))}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="下一月"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-0.5 text-[11px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="flex h-7 items-center justify-center font-medium">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 px-0.5">
        {days.map((day) => {
          const dayStr = day.format(ISO);
          const inMonth = day.month() === viewMonth.month();
          const isToday = dayStr === todayStr;
          const isSelected = value === dayStr;
          const disabled = isDisabled(day);

          return (
            <button
              key={dayStr}
              type="button"
              onClick={() => !disabled && onSelect(dayStr)}
              disabled={disabled}
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                disabled
                  ? "cursor-not-allowed text-muted-foreground/30"
                  : isSelected
                    ? "bg-foreground font-semibold text-background hover:bg-foreground/90"
                    : isToday
                      ? "border border-foreground/40 font-semibold text-foreground hover:bg-muted"
                      : inMonth
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/50 hover:bg-muted/60",
              )}
              aria-pressed={isSelected || undefined}
              aria-label={day.format("YYYY 年 M 月 D 日")}
            >
              {day.date()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => onSelect(today.subtract(1, "day").format(ISO))}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          昨天
        </button>
        <button
          type="button"
          onClick={() => onSelect(todayStr)}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          今天
        </button>
      </div>
    </div>
  );
}

/** 生成 42 天（6 周）的日历网格，从所在月第 1 周的周一开始。 */
function buildCalendarDays(viewMonth: Dayjs): Dayjs[] {
  const firstOfMonth = viewMonth.startOf("month");
  // dayjs 的 day() 周日是 0；我们想周一开头：(day + 6) % 7
  const startOffset = (firstOfMonth.day() + 6) % 7;
  const start = firstOfMonth.subtract(startOffset, "day");
  return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
}
