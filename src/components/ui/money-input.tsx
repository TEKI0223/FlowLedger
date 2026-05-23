"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

type MoneyInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "inputMode">;

/**
 * 金额输入框，统一行为：
 * - 失焦时显示千分位（1,200）
 * - 聚焦时去掉千分位方便编辑（1200）
 * - 提交时 form data 拿到带千分位的字符串，server 端用 `parseMoneyToMinor` 解析（已自动 strip）
 * - 支持受控（value + onChange）与非受控（defaultValue）两种模式
 *
 * 父组件拿到的 onChange.target.value **永远是 canonical 无千分位形态**，方便比较与解析。
 */
export function MoneyInput({
  defaultValue,
  value,
  onChange,
  onFocus,
  onBlur,
  ref,
  ...rest
}: MoneyInputProps) {
  const isControlled = value !== undefined;

  const [uncontrolledValue, setUncontrolledValue] = React.useState<string>(() =>
    stripCommas(String(defaultValue ?? "")),
  );
  const [isFocused, setIsFocused] = React.useState(false);

  const canonical = isControlled ? stripCommas(String(value ?? "")) : uncontrolledValue;
  const displayValue = isFocused ? canonical : formatWithCommas(canonical);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(event) => {
        const stripped = stripCommas(event.target.value);
        if (!isControlled) {
          setUncontrolledValue(stripped);
        }
        if (onChange) {
          // 把 e.target.value 改成 canonical 形态再回调给父组件
          const synthetic = Object.assign({}, event, {
            target: Object.assign({}, event.target, { value: stripped }),
          });
          onChange(synthetic as React.ChangeEvent<HTMLInputElement>);
        }
      }}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      {...rest}
    />
  );
}

export function formatWithCommas(input: string): string {
  if (!input) return "";
  const negative = input.startsWith("-");
  const unsigned = negative ? input.slice(1) : input;
  const firstDot = unsigned.indexOf(".");
  const intPart = firstDot === -1 ? unsigned : unsigned.slice(0, firstDot);
  const decPart = firstDot === -1 ? undefined : unsigned.slice(firstDot + 1);
  // 不是纯数字（abc）或带多个小数点（12.3.4）直接返回，避免吃掉错误内容
  if (!/^\d*$/.test(intPart)) return input;
  if (decPart !== undefined && !/^\d*$/.test(decPart)) return input;
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const formatted = decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
  return negative ? `-${formatted}` : formatted;
}

export function stripCommas(input: string): string {
  return input.replace(/,/g, "");
}
