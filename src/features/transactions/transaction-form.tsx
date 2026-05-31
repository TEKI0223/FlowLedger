"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { TransactionActionState } from "@/app/actions/transactions";
import { MoneyText } from "@/components/privacy/money-text";
import { DatePicker } from "@/components/ui/date-picker";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  currencies,
  currencyLabels,
  formatMinorForInput,
  parseMoneyToMinor,
  transactionTypeLabels,
  type Currency,
  type TransactionType,
} from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";
import { CategoryPicker, type CategoryPickerOption } from "@/features/categories/category-picker";
import { SplitsField } from "@/features/transactions/splits-field";
import { todayIsoDate } from "@/lib/dates";

const initialState: TransactionActionState = {};

type Lookups = {
  accounts: Array<{
    id: string;
    name: string;
    type?: "cash" | "bank" | "credit_card" | "wallet";
    lastDigits: string | null;
    currency: Currency;
    balanceMinor: number;
  }>;
  categories: CategoryPickerOption[];
  paymentMethods: Array<{ id: string; name: string; defaultAccountId: string | null }>;
  /** 按信用卡 accountId 索引的可选账单期；非信用卡账户没有 entry */
  creditCardStatementsByAccountId?: Record<
    string,
    Array<{ periodEnd: string; dueDate: string; isCurrent: boolean }>
  >;
};

type Defaults = {
  occurredOn: string;
  type: TransactionType;
  amount?: string;
  currency: Currency;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  creditCardStatementOverride?: string | null;
  note?: string;
};

type TransactionFormProps = {
  action: (prev: TransactionActionState, formData: FormData) => Promise<TransactionActionState>;
  lookups: Lookups;
  defaults: Defaults;
  submitLabel: string;
  id?: string;
  hideSubmit?: boolean;
  /**
   * "create"：新建交易（adjustment 用"输入实际余额"UI）
   * "edit"：编辑已有交易（adjustment 保留传统的差额输入）
   */
  mode?: "create" | "edit";
  /**
   * 是否允许把总额拆分到其他分类（保存为多笔交易）。
   * 只在 create + expense/income 时实际渲染；edit/transfer/adjustment 永远 false。
   */
  allowSplits?: boolean;
};

const accountFieldsByType: Record<
  TransactionType,
  { showSource: boolean; sourceLabel: string; showTarget: boolean; targetLabel: string }
> = {
  income: {
    showSource: false,
    sourceLabel: "",
    showTarget: true,
    targetLabel: "入账账户",
  },
  expense: {
    showSource: true,
    sourceLabel: "付款账户",
    showTarget: false,
    targetLabel: "",
  },
  transfer: {
    showSource: true,
    sourceLabel: "转出账户",
    showTarget: true,
    targetLabel: "转入账户",
  },
  adjustment: {
    showSource: false,
    sourceLabel: "",
    showTarget: true,
    targetLabel: "校准账户",
  },
};

export function TransactionForm({
  action,
  lookups,
  defaults,
  submitLabel,
  id,
  hideSubmit = false,
  mode = "create",
  allowSplits = false,
}: TransactionFormProps) {
  const [state, formAction] = useActionState<TransactionActionState, FormData>(
    action,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const values = state.values;

  const initialType = (values?.type as TransactionType) ?? defaults.type;
  const [type, setType] = useState<TransactionType>(initialType);

  const [currency, setCurrency] = useState<Currency>(
    (values?.currency as Currency) ?? defaults.currency,
  );

  const [sourceAccountId, setSourceAccountId] = useState<string>(
    values?.sourceAccountId ?? defaults.sourceAccountId ?? "",
  );
  const [targetAccountId, setTargetAccountId] = useState<string>(
    values?.targetAccountId ?? defaults.targetAccountId ?? "",
  );

  const [targetBalance, setTargetBalance] = useState<string>("");

  // 仅 allowSplits 时观察金额 / 分类的实时值，喂给 SplitsField 计算剩余。
  // 输入框本身仍是非受控（defaultValue），通过 onChange 旁路同步到这里。
  const [trackedAmount, setTrackedAmount] = useState<string>(
    values?.amount ?? defaults.amount ?? "",
  );
  const [trackedCategoryId, setTrackedCategoryId] = useState<string>(
    values?.categoryId ?? defaults.categoryId ?? "",
  );

  // 拆分默认折叠：避免页面一打开就跳出 CategoryPicker 对话框
  const [splitsOpen, setSplitsOpen] = useState(false);

  // 「按 props/state 变化反向同步本地状态」的 React 官方模式（render 阶段调用 setState）：
  // 每次 action 返回新的 state.values（错误回填），把已返回的值复制到本地受控状态。
  // 用 prevState 标记避免无限循环。
  // ref: https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const v = state.values;
    if (v) {
      if (v.type) setType(v.type as TransactionType);
      if (v.currency) setCurrency(v.currency as Currency);
      if (v.sourceAccountId !== undefined) setSourceAccountId(v.sourceAccountId);
      if (v.targetAccountId !== undefined) setTargetAccountId(v.targetAccountId);
      if (v.amount !== undefined) setTrackedAmount(v.amount);
      if (v.categoryId !== undefined) setTrackedCategoryId(v.categoryId);
    } else if (state.success) {
      setType(defaults.type);
      setCurrency(defaults.currency);
      setSourceAccountId(defaults.sourceAccountId ?? "");
      setTargetAccountId(defaults.targetAccountId ?? "");
      setTargetBalance("");
      setTrackedAmount(defaults.amount ?? "");
      setTrackedCategoryId(defaults.categoryId ?? "");
    }
  }

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  const fieldConfig = accountFieldsByType[type];

  // 是否启用"输入实际余额"模式：仅 create 模式下的 adjustment
  const useTargetBalanceUI = mode === "create" && type === "adjustment";

  const targetAccount = lookups.accounts.find((a) => a.id === targetAccountId) ?? null;
  const currentBalanceMinor = targetAccount?.balanceMinor ?? 0;

  // 校准模式下基于"目标余额 - 当前余额"算 delta；同时把解析错误暴露出来
  const targetBalanceResult = useTargetBalanceUI
    ? parseTargetBalance(targetBalance, currency, currentBalanceMinor)
    : null;
  const submitDisabled = Boolean(targetBalanceResult && !targetBalanceResult.ok);

  // amount 输入框的实际值：校准模式用 delta（解析成功才有）；其他模式用用户输入
  const amountFieldValue =
    useTargetBalanceUI && targetBalanceResult?.ok
      ? formatMinorForInput({ amountMinor: targetBalanceResult.delta, currency })
      : useTargetBalanceUI
        ? ""
        : undefined;

  function handlePaymentMethodChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newPmId = event.target.value;
    if (!newPmId) return;
    const pm = lookups.paymentMethods.find((m) => m.id === newPmId);
    if (pm?.defaultAccountId) {
      setSourceAccountId(pm.defaultAccountId);
    }
  }

  return (
    <>
      {state.success ? <InlineAlert>{state.success}</InlineAlert> : null}
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form ref={formRef} id={id} action={formAction} className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="occurredOn">日期</Label>
            <DatePicker
              id="occurredOn"
              name="occurredOn"
              required
              defaultValue={values?.occurredOn ?? defaults.occurredOn ?? todayIsoDate()}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">类型</Label>
            <NativeSelect
              id="type"
              name="type"
              required
              value={type}
              onChange={(event) => setType(event.target.value as TransactionType)}
            >
              {Object.entries(transactionTypeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {useTargetBalanceUI ? (
          // 调整：输入实际余额，系统算差额
          <div className="grid gap-3 rounded-md border border-adjustment/30 bg-adjustment/5 p-3">
            <div className="grid gap-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">当前系统余额</p>
              <p className="text-lg font-semibold tabular-nums">
                {targetAccount ? (
                  <MoneyText amountMinor={currentBalanceMinor} currency={targetAccount.currency} />
                ) : (
                  "请先选择校准账户"
                )}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetBalance">实际余额（系统会算差额）</Label>
              <MoneyInput
                id="targetBalance"
                placeholder={targetAccount ? "盘点出来的真实余额" : "请先选择校准账户"}
                value={targetBalance}
                onChange={(event) => setTargetBalance(event.target.value)}
                disabled={!targetAccount}
                required
                className="h-11 text-base tabular-nums"
              />
            </div>
            {targetAccount && targetBalanceResult?.ok ? (
              <p className="text-xs text-muted-foreground">
                差额：
                <span
                  className={
                    targetBalanceResult.delta > 0
                      ? "text-income font-semibold tabular-nums"
                      : targetBalanceResult.delta < 0
                        ? "text-expense font-semibold tabular-nums"
                        : "font-semibold tabular-nums"
                  }
                >
                  {targetBalanceResult.delta >= 0 ? "+" : ""}
                  <MoneyText
                    amountMinor={targetBalanceResult.delta}
                    currency={targetAccount.currency}
                  />
                </span>
              </p>
            ) : targetAccount && targetBalanceResult && !targetBalanceResult.ok ? (
              <p className="text-xs text-destructive">{targetBalanceResult.error}</p>
            ) : null}
            {/* 实际提交的 amount 字段 */}
            <input type="hidden" name="amount" value={amountFieldValue ?? ""} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="amount">金额</Label>
              <MoneyInput
                id="amount"
                name="amount"
                required
                placeholder="例如：1,200"
                defaultValue={values?.amount ?? defaults.amount ?? ""}
                onChange={(event) => setTrackedAmount(event.target.value)}
                className="h-12 text-xl font-semibold tabular-nums"
              />
              {type === "adjustment" ? (
                <p className="text-xs text-muted-foreground">
                  填差额：余额需要增加输入正数，需要减少输入负数（例如 −1000）
                </p>
              ) : null}
            </div>
            <div className="grid gap-2 sm:w-32">
              <Label htmlFor="currency">币种</Label>
              <NativeSelect
                id="currency"
                name="currency"
                required
                value={currency}
                onChange={(event) => setCurrency(event.target.value as Currency)}
              >
                {currencies.map((curr) => (
                  <option value={curr} key={curr}>
                    {curr} · {currencyLabels[curr]}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}

        {/* 调整 UI 里也需要 currency 字段，但不让用户选（跟随选中的账户币种） */}
        {useTargetBalanceUI ? (
          <input type="hidden" name="currency" value={targetAccount?.currency ?? currency} />
        ) : null}

        {!useTargetBalanceUI ? (
          <div className="grid gap-2">
            <Label htmlFor="categoryId">分类</Label>
            <CategoryPicker
              key={values?.categoryId ?? defaults.categoryId ?? "none"}
              name="categoryId"
              categories={lookups.categories}
              defaultValue={values?.categoryId ?? defaults.categoryId ?? ""}
              onChange={setTrackedCategoryId}
            />
          </div>
        ) : null}

        {allowSplits && mode === "create" && (type === "expense" || type === "income") ? (
          <div className="grid gap-2">
            {splitsOpen ? (
              <SplitsField
                totalAmountStr={trackedAmount}
                currency={currency}
                mainCategoryId={trackedCategoryId}
                mainCategoryLabel={
                  lookups.categories.find((c) => c.id === trackedCategoryId)?.label ?? null
                }
                categories={lookups.categories}
              />
            ) : (
              <button
                type="button"
                onClick={() => setSplitsOpen(true)}
                className="inline-flex h-9 w-fit items-center gap-1 self-start rounded-full px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                + 拆分一部分到其他分类
              </button>
            )}
          </div>
        ) : null}

        {fieldConfig.showSource ? (
          <div className="grid gap-2">
            <Label htmlFor="paymentMethodId">支付方式</Label>
            <NativeSelect
              id="paymentMethodId"
              name="paymentMethodId"
              defaultValue={values?.paymentMethodId ?? defaults.paymentMethodId ?? ""}
              onChange={handlePaymentMethodChange}
            >
              <option value="">不选择</option>
              {lookups.paymentMethods.map((paymentMethod) => (
                <option value={paymentMethod.id} key={paymentMethod.id}>
                  {paymentMethod.name}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              选择后会自动把支付方式的默认资金来源填到{fieldConfig.sourceLabel}
            </p>
          </div>
        ) : null}

        <div
          className={
            fieldConfig.showSource && fieldConfig.showTarget
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
              : "grid gap-3"
          }
        >
          <div className={fieldConfig.showSource ? "grid gap-2" : "hidden"}>
            <Label htmlFor="sourceAccountId">{fieldConfig.sourceLabel || "来源账户"}</Label>
            <NativeSelect
              id="sourceAccountId"
              name="sourceAccountId"
              value={sourceAccountId}
              onChange={(event) => setSourceAccountId(event.target.value)}
            >
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {formatAccountName(account)} · {account.currency}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className={fieldConfig.showTarget ? "grid gap-2" : "hidden"}>
            <Label htmlFor="targetAccountId">{fieldConfig.targetLabel || "目标账户"}</Label>
            <NativeSelect
              id="targetAccountId"
              name="targetAccountId"
              value={targetAccountId}
              onChange={(event) => {
                setTargetAccountId(event.target.value);
                // 切换校准账户时，币种跟随
                if (useTargetBalanceUI) {
                  const acc = lookups.accounts.find((a) => a.id === event.target.value);
                  if (acc) {
                    setCurrency(acc.currency);
                  }
                }
              }}
            >
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {formatAccountName(account)} · {account.currency}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        {(() => {
          const sourceAccount = lookups.accounts.find((a) => a.id === sourceAccountId);
          const statements =
            sourceAccount?.type === "credit_card" && fieldConfig.showSource
              ? lookups.creditCardStatementsByAccountId?.[sourceAccountId]
              : undefined;
          if (!statements || statements.length === 0) return null;
          const defaultOverride =
            values?.creditCardStatementOverride ?? defaults.creditCardStatementOverride ?? "";
          return (
            <div className="grid gap-2">
              <Label htmlFor="creditCardStatementOverride">归入账单</Label>
              <NativeSelect
                id="creditCardStatementOverride"
                name="creditCardStatementOverride"
                defaultValue={defaultOverride}
                key={sourceAccountId}
              >
                <option value="">自动（按日期）</option>
                {statements.map((s) => (
                  <option value={s.periodEnd} key={s.periodEnd}>
                    {formatStatementOption(s)}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-xs text-muted-foreground">
                默认按交易日期落入对应账单。如卡公司有延迟可手动指派。
              </p>
            </div>
          );
        })()}

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            placeholder="可选"
            defaultValue={values?.note ?? defaults.note ?? ""}
            className="text-base"
          />
        </div>

        {hideSubmit ? null : <SubmitButton disabled={submitDisabled}>{submitLabel}</SubmitButton>}
      </form>
    </>
  );
}

function formatStatementOption(s: {
  periodEnd: string;
  dueDate: string;
  isCurrent: boolean;
}): string {
  const closing = shortDate(s.periodEnd);
  const due = shortDate(s.dueDate);
  return `${closing} 账单（${due} 还）${s.isCurrent ? " · 当期" : ""}`;
}

function shortDate(iso: string): string {
  // "2026-05-25" → "5/25"
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

type TargetBalanceResult = { ok: true; delta: number } | { ok: false; error: string } | null;

function parseTargetBalance(
  targetBalanceInput: string,
  currency: Currency,
  currentBalanceMinor: number,
): TargetBalanceResult {
  const trimmed = targetBalanceInput.trim();
  if (!trimmed) return null;

  try {
    const targetMinor = parseMoneyToMinor(trimmed, currency);
    return { ok: true, delta: targetMinor - currentBalanceMinor };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "金额格式不正确",
    };
  }
}
