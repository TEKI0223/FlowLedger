"use client";

import { useActionState, useState } from "react";
import type { QuickEntryTemplateActionState } from "@/app/actions/quick-entry-templates";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  currencies,
  currencyLabels,
  transactionTypeLabels,
  type Currency,
  type TransactionType,
} from "@/domain/finance";

const initialState: QuickEntryTemplateActionState = {};

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

type Lookups = {
  accounts: Array<{ id: string; name: string; currency: Currency }>;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string; defaultAccountId: string | null }>;
};

type Defaults = {
  name?: string;
  type?: TransactionType;
  currency?: Currency;
  amount?: string;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
  enabled?: boolean;
};

type TemplateFormProps = {
  action: (
    prev: QuickEntryTemplateActionState,
    formData: FormData,
  ) => Promise<QuickEntryTemplateActionState>;
  lookups: Lookups;
  defaults?: Defaults;
  submitLabel: string;
};

export function TemplateForm({
  action,
  lookups,
  defaults = {},
  submitLabel,
}: TemplateFormProps) {
  const [state, formAction] = useActionState<QuickEntryTemplateActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  const [type, setType] = useState<TransactionType>(
    (values?.type as TransactionType) ?? defaults.type ?? "expense",
  );
  const [sourceAccountId, setSourceAccountId] = useState<string>(
    values?.sourceAccountId ?? defaults.sourceAccountId ?? "",
  );
  const [targetAccountId, setTargetAccountId] = useState<string>(
    values?.targetAccountId ?? defaults.targetAccountId ?? "",
  );

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const v = state.values;
    if (v) {
      if (v.type) setType(v.type as TransactionType);
      if (v.sourceAccountId !== undefined) setSourceAccountId(v.sourceAccountId);
      if (v.targetAccountId !== undefined) setTargetAccountId(v.targetAccountId);
    }
  }

  const fieldConfig = accountFieldsByType[type];

  function handlePaymentMethodChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newPmId = event.target.value;
    if (!newPmId) return;
    const pm = lookups.paymentMethods.find((m) => m.id === newPmId);
    if (pm?.defaultAccountId) setSourceAccountId(pm.defaultAccountId);
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
            placeholder="例如：超市、咖啡、外食"
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
              onChange={(event) => setType(event.target.value as TransactionType)}
            >
              {Object.entries(transactionTypeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">币种</Label>
            <NativeSelect
              id="currency"
              name="currency"
              required
              defaultValue={values?.currency ?? defaults.currency ?? "JPY"}
            >
              {currencies.map((curr) => (
                <option value={curr} key={curr}>
                  {curr} · {currencyLabels[curr]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="amount">金额（留空表示「点击时再填」）</Label>
          <MoneyInput
            id="amount"
            name="amount"
            placeholder="留空 = 用户每次输入"
            defaultValue={values?.amount ?? defaults.amount ?? ""}
            className="h-11 text-base tabular-nums"
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
              选择后会自动填入对应的{fieldConfig.sourceLabel}
            </p>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="note">默认备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={2}
            placeholder="可选；用户可在录入时改"
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
          <span>启用（停用后不在首页显示）</span>
        </label>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
