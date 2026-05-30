"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { MoneyInput } from "@/components/ui/money-input";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/domain/finance";
import { CategoryPicker, type CategoryPickerOption } from "@/features/categories/category-picker";
import type { SplitEntry } from "@/lib/transaction-splits";
import { validateSplits } from "@/lib/transaction-splits";

type SplitRow = SplitEntry & { key: string; autoOpenPicker?: boolean };

type SplitsFieldProps = {
  /** 提交时 hidden 字段名，默认 "splits"。 */
  name?: string;
  /** 主金额输入框的当前值（canonical，无千分位）。 */
  totalAmountStr: string;
  currency: Currency;
  /** 主分类 id，用于禁止拆分到同分类。 */
  mainCategoryId: string;
  /** 主分类 label，用于剩余金额说明。 */
  mainCategoryLabel: string | null;
  categories: CategoryPickerOption[];
  /** 表单错误回填时复原拆分行；默认空数组。 */
  defaultRows?: SplitEntry[];
};

let rowKeySeq = 0;
const newKey = () => `split-${++rowKeySeq}`;

export function SplitsField({
  name = "splits",
  totalAmountStr,
  currency,
  mainCategoryId,
  mainCategoryLabel,
  categories,
  defaultRows = [],
}: SplitsFieldProps) {
  // 挂载时如果没有错误回填的行，直接放一行 + 自动开分类对话框，省一次点击。
  const [rows, setRows] = useState<SplitRow[]>(() => {
    if (defaultRows.length > 0) {
      return defaultRows.map((entry) => ({ ...entry, key: newKey() }));
    }
    return [{ key: newKey(), categoryId: "", amount: "", autoOpenPicker: true }];
  });

  const totalMinor = useMemo(() => {
    if (!totalAmountStr.trim()) return null;
    try {
      return Math.abs(parseMoneyToMinor(totalAmountStr, currency));
    } catch {
      return null;
    }
  }, [totalAmountStr, currency]);

  const validation = useMemo(() => {
    if (totalMinor === null) return null;
    return validateSplits(
      rows.filter((r) => r.categoryId && r.amount.trim()),
      totalMinor,
      currency,
      mainCategoryId,
    );
  }, [rows, totalMinor, currency, mainCategoryId]);

  function addRow() {
    setRows((current) => [
      ...current,
      { key: newKey(), categoryId: "", amount: "", autoOpenPicker: true },
    ]);
  }
  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }
  function updateRow(key: string, patch: Partial<SplitEntry>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  const serialized = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.categoryId && r.amount.trim())
          .map((r) => ({ categoryId: r.categoryId, amount: r.amount })),
      ),
    [rows],
  );

  return (
    <div className="grid gap-2 rounded-lg bg-muted/30 p-2">
      <input type="hidden" name={name} value={serialized} />

      <ul className="grid gap-1.5">
        {rows.map((row) => (
          <SplitRowEditor
            key={row.key}
            row={row}
            categories={categories}
            onChange={(patch) => updateRow(row.key, patch)}
            onRemove={() => removeRow(row.key)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex h-8 items-center justify-center gap-1 self-center rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3.5" /> 再加一项
      </button>

      <SplitsSummary
        validation={validation}
        totalMinor={totalMinor}
        currency={currency}
        mainCategoryLabel={mainCategoryLabel}
      />
    </div>
  );
}

function SplitRowEditor({
  row,
  categories,
  onChange,
  onRemove,
}: {
  row: SplitRow;
  categories: CategoryPickerOption[];
  onChange: (patch: Partial<SplitEntry>) => void;
  onRemove: () => void;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const prevCategoryIdRef = useRef(row.categoryId);

  // 挑完分类（空 → 有值）后自动 focus 金额输入框。
  useEffect(() => {
    const prev = prevCategoryIdRef.current;
    prevCategoryIdRef.current = row.categoryId;
    if (!prev && row.categoryId) {
      amountRef.current?.focus();
    }
  }, [row.categoryId]);

  return (
    <li className="flex items-center gap-1.5">
      <div className="min-w-0 flex-1">
        <CategoryPicker
          categories={categories}
          value={row.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          defaultOpen={row.autoOpenPicker}
          emptyLabel="选择分类"
        />
      </div>
      <MoneyInput
        ref={amountRef}
        placeholder="金额"
        value={row.amount}
        onChange={(event) => onChange({ amount: event.target.value })}
        className="h-11 w-24 text-base tabular-nums"
      />
      <button
        type="button"
        aria-label="删除拆分"
        onClick={onRemove}
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>
    </li>
  );
}

function SplitsSummary({
  validation,
  totalMinor,
  currency,
  mainCategoryLabel,
}: {
  validation: ReturnType<typeof validateSplits> | null;
  totalMinor: number | null;
  currency: Currency;
  mainCategoryLabel: string | null;
}) {
  if (totalMinor === null || !validation) return null;

  if (!validation.ok) {
    return <p className="text-center text-xs font-medium text-destructive">{validation.error}</p>;
  }

  if (validation.splits.length === 0) return null;

  const mainName = mainCategoryLabel ?? "主分类";

  if (validation.mainAmountMinor === 0) {
    return (
      <p className="text-center text-xs text-muted-foreground">总额拆完，不创建「{mainName}」</p>
    );
  }

  return (
    <p className="text-center text-xs text-muted-foreground">
      剩余{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {formatMoney({ amountMinor: validation.mainAmountMinor, currency })}
      </span>{" "}
      → {mainName}
    </p>
  );
}
