"use client";

import { useMemo, useState } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { formatMoney, parseMoneyToMinor, type Currency } from "@/domain/finance";
import { CategoryPicker, type CategoryPickerOption } from "@/features/categories/category-picker";
import type { SplitEntry } from "@/lib/transaction-splits";
import { validateSplits } from "@/lib/transaction-splits";

type SplitRow = SplitEntry & { key: string };

type SplitsFieldProps = {
  /** 提交时 hidden 字段名，默认 "splits"。 */
  name?: string;
  /** 主金额输入框的当前值（canonical，无千分位）。 */
  totalAmountStr: string;
  currency: Currency;
  /** 主分类 id，用于禁止拆分到同分类。 */
  mainCategoryId: string;
  /** 主分类 label（"食材"/"外食/咖啡"），用于剩余金额说明。 */
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
  const [rows, setRows] = useState<SplitRow[]>(() =>
    defaultRows.map((entry) => ({ ...entry, key: newKey() })),
  );

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
    return validateSplits(rows, totalMinor, currency, mainCategoryId);
  }, [rows, totalMinor, currency, mainCategoryId]);

  function addRow() {
    setRows((current) => [...current, { key: newKey(), categoryId: "", amount: "" }]);
  }
  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }
  function updateRow(key: string, patch: Partial<SplitRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  // 序列化时仅保留完整的 row，避免半成品（用户加了行还没填）打到 server 报错。
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
    <div className="grid gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
      <input type="hidden" name={name} value={serialized} />

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          拆分到其他分类
          {rows.length > 0 ? (
            <span className="ml-1 text-xs text-muted-foreground">（{rows.length} 项）</span>
          ) : null}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={addRow} className="h-7 gap-1 text-xs">
          <PlusIcon className="size-3.5" />
          添加
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          这张小票里有不同分类的商品时使用。例如总额 ¥1,088，其中 ¥258 是日用品，剩余的归到主分类。
        </p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((row, index) => (
            <SplitRowEditor
              key={row.key}
              index={index}
              row={row}
              categories={categories}
              onChange={(patch) => updateRow(row.key, patch)}
              onRemove={() => removeRow(row.key)}
            />
          ))}
        </ul>
      )}

      {rows.length > 0 ? (
        <SplitsSummary
          validation={validation}
          totalMinor={totalMinor}
          currency={currency}
          mainCategoryLabel={mainCategoryLabel}
        />
      ) : null}
    </div>
  );
}

function SplitRowEditor({
  index,
  row,
  categories,
  onChange,
  onRemove,
}: {
  index: number;
  row: SplitRow;
  categories: CategoryPickerOption[];
  onChange: (patch: Partial<SplitRow>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="grid gap-2 rounded-md border border-border bg-card p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">拆分 #{index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`删除拆分 #${index + 1}`}
          onClick={onRemove}
        >
          <XIcon className="size-3.5" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <CategoryPicker
          categories={categories}
          value={row.categoryId}
          onChange={(categoryId) => onChange({ categoryId })}
          emptyLabel="选择拆分分类"
        />
        <MoneyInput
          placeholder="金额"
          value={row.amount}
          onChange={(event) => onChange({ amount: event.target.value })}
          className="h-11 w-32 text-base tabular-nums"
        />
      </div>
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
  if (totalMinor === null) {
    return <p className="text-xs text-muted-foreground">先填写总金额后才能看到拆分结果。</p>;
  }
  if (!validation) return null;

  if (!validation.ok) {
    return <p className="text-xs font-medium text-destructive">{validation.error}</p>;
  }

  if (validation.mainAmountMinor === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        总金额已被拆分用完，将保存为 {validation.splits.length} 笔交易，
        <span className="font-medium">不会创建主分类那笔</span>。
      </p>
    );
  }

  const mainName = mainCategoryLabel ?? "主分类";
  return (
    <p className="text-xs text-muted-foreground">
      剩余{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {formatMoney({ amountMinor: validation.mainAmountMinor, currency })}
      </span>{" "}
      会记到「{mainName}」
    </p>
  );
}
