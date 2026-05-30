"use client";

import * as React from "react";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { todayIsoDate } from "@/lib/dates";

type Variant = "input" | "chip";

type DatePickerProps = {
  /** 表单 name；省略则不渲染 hidden input。 */
  name?: string;
  /** 受控值（YYYY-MM-DD）。 */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** YYYY-MM-DD 上限（含），默认无限制。 */
  max?: string;
  /** YYYY-MM-DD 下限（含），默认无限制。 */
  min?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** 显示样式：input = 表单字段（默认），chip = 紧凑胶囊。 */
  variant?: Variant;
  /** 触发按钮额外 className。 */
  className?: string;
  placeholder?: string;
  /** 自定义触发按钮的文字渲染。默认 input 用 "YYYY-MM-DD"；chip 用 "今天/昨天/M月D日"。 */
  formatLabel?: (value: string) => React.ReactNode;
};

export function DatePicker({
  name,
  value: controlledValue,
  defaultValue = "",
  onChange,
  max,
  min,
  required,
  disabled,
  id,
  variant = "input",
  className,
  placeholder = "选择日期",
  formatLabel,
}: DatePickerProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = React.useState(false);

  function handleSelect(next: string) {
    if (!isControlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  const label = value ? (formatLabel ?? defaultFormat(variant))(value) : placeholder;
  const isPlaceholder = !value;

  return (
    <>
      {name ? <input id={id} name={name} type="hidden" value={value} required={required} /> : null}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              disabled={disabled}
              className={
                variant === "chip"
                  ? cn(chipTriggerClasses(value, max), className)
                  : cn(inputTriggerClasses(isPlaceholder), className)
              }
            >
              <CalendarIcon
                className={cn(variant === "chip" ? "size-3.5" : "size-4 text-muted-foreground")}
              />
              <span className={variant === "input" ? "flex-1 text-left" : ""}>{label}</span>
            </button>
          }
        />
        <PopoverContent align="start">
          <Calendar value={value} max={max} min={min} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    </>
  );
}

function inputTriggerClasses(isPlaceholder: boolean) {
  return cn(
    "flex h-11 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-base transition-colors",
    "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isPlaceholder ? "text-muted-foreground" : "text-foreground",
    "disabled:cursor-not-allowed disabled:opacity-50",
  );
}

function chipTriggerClasses(value: string, max: string | undefined) {
  // 非"今天"时高亮，提示用户改过日期
  const isCustom = value !== "" && value !== (max ?? todayIsoDate());
  return cn(
    "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
    isCustom
      ? "border-foreground/30 bg-foreground text-background"
      : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );
}

function defaultFormat(variant: Variant): (value: string) => React.ReactNode {
  if (variant === "chip") return chipFormat;
  return inputFormat;
}

function chipFormat(value: string): string {
  const today = todayIsoDate();
  const yesterday = dayjs(today).subtract(1, "day").format("YYYY-MM-DD");
  if (value === today) return "今天";
  if (value === yesterday) return "昨天";
  return dayjs(value).format("M月D日");
}

function inputFormat(value: string): string {
  return dayjs(value).format("YYYY-MM-DD");
}
