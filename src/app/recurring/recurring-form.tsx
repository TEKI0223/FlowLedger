"use client";

import { useActionState, useState } from "react";
import type { RecurringActionState } from "@/app/actions/recurring";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { currencies, currencyLabels, type Currency } from "@/domain/finance";
import { recurringFrequencies, recurringFrequencyLabels } from "@/domain/recurring";
import { todayIsoDate } from "@/lib/dates";

const initialState: RecurringActionState = {};

const RECURRING_TYPE_LABELS = {
  income: "收入",
  expense: "支出",
  transfer: "转账",
} as const;

type RecurringType = keyof typeof RECURRING_TYPE_LABELS;

type Lookups = {
  accounts: Array<{ id: string; name: string; currency: Currency }>;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string; defaultAccountId: string | null }>;
};

type Defaults = {
  name?: string;
  type?: RecurringType;
  amount?: string;
  amountFixed?: boolean;
  currency?: Currency;
  frequency?: "monthly" | "weekly" | "yearly";
  nextDate?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled?: boolean;
};

type RecurringFormProps = {
  action: (prev: RecurringActionState, formData: FormData) => Promise<RecurringActionState>;
  lookups: Lookups;
  defaults?: Defaults;
  submitLabel: string;
};

const accountFieldsByType: Record<
  RecurringType,
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
};

export function RecurringForm({ action, lookups, defaults = {}, submitLabel }: RecurringFormProps) {
  const [state, formAction] = useActionState<RecurringActionState, FormData>(action, initialState);
  const values = state.values;

  const initialType =
    (values?.type as RecurringType | undefined) ?? defaults.type ?? ("expense" as RecurringType);
  const [type, setType] = useState<RecurringType>(initialType);

  const [sourceAccountId, setSourceAccountId] = useState<string>(
    values?.sourceAccountId ?? defaults.sourceAccountId ?? "",
  );
  const [targetAccountId, setTargetAccountId] = useState<string>(
    values?.targetAccountId ?? defaults.targetAccountId ?? "",
  );

  const fieldConfig = accountFieldsByType[type];

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
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">名称</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="例如：房租、网络、工资"
            defaultValue={values?.name ?? defaults.name ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="type">类型</Label>
            <NativeSelect
              id="type"
              name="type"
              required
              value={type}
              onChange={(event) => setType(event.target.value as RecurringType)}
            >
              {Object.entries(RECURRING_TYPE_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="frequency">周期</Label>
            <NativeSelect
              id="frequency"
              name="frequency"
              required
              defaultValue={values?.frequency ?? defaults.frequency ?? "monthly"}
            >
              {recurringFrequencies.map((freq) => (
                <option value={freq} key={freq}>
                  {recurringFrequencyLabels[freq]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="amount">金额（变动金额可留空）</Label>
            <MoneyInput
              id="amount"
              name="amount"
              placeholder="例如：8,800"
              defaultValue={values?.amount ?? defaults.amount ?? ""}
              className="h-11 text-base tabular-nums"
            />
          </div>
          <div className="grid gap-2 sm:w-32">
            <Label htmlFor="currency">币种</Label>
            <NativeSelect
              id="currency"
              name="currency"
              required
              defaultValue={values?.currency ?? defaults.currency ?? "JPY"}
            >
              {currencies.map((currency) => (
                <option value={currency} key={currency}>
                  {currency} · {currencyLabels[currency]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="amountFixed"
            type="checkbox"
            defaultChecked={values?.amountFixed ?? defaults.amountFixed ?? false}
            className="size-4 rounded border-input accent-primary"
          />
          <span>固定金额（变动金额请留空 → 确认时再填）</span>
        </label>

        <div className="grid gap-2">
          <Label htmlFor="nextDate">下次发生日期</Label>
          <Input
            id="nextDate"
            name="nextDate"
            type="date"
            required
            defaultValue={values?.nextDate ?? defaults.nextDate ?? todayIsoDate()}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="categoryId">分类</Label>
          <NativeSelect
            id="categoryId"
            name="categoryId"
            defaultValue={values?.categoryId ?? defaults.categoryId ?? ""}
          >
            <option value="">无分类</option>
            {lookups.categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </div>

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
                  {account.name} · {account.currency}
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
              onChange={(event) => setTargetAccountId(event.target.value)}
            >
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

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
              选择后会自动填入{fieldConfig.sourceLabel}
            </p>
          </div>
        ) : null}

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

        <label className="flex items-center gap-2 text-sm">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={values?.enabled ?? defaults.enabled ?? true}
            className="size-4 rounded border-input accent-primary"
          />
          <span>启用（停用后不再出现在待确认列表）</span>
        </label>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
