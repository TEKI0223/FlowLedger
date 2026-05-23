"use client";

import { useActionState, useState } from "react";
import type { TransactionActionState } from "@/app/actions/transactions";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { todayIsoDate } from "@/lib/dates";

const initialState: TransactionActionState = {};

type Lookups = {
  accounts: Array<{ id: string; name: string; currency: Currency }>;
  categories: Array<{ id: string; name: string }>;
  paymentMethods: Array<{ id: string; name: string; defaultAccountId: string | null }>;
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
  note?: string;
};

type TransactionFormProps = {
  action: (prev: TransactionActionState, formData: FormData) => Promise<TransactionActionState>;
  lookups: Lookups;
  defaults: Defaults;
  submitLabel: string;
};

// 根据交易类型动态决定来源 / 目标账户字段的可见性与标签
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

export function TransactionForm({ action, lookups, defaults, submitLabel }: TransactionFormProps) {
  const [state, formAction] = useActionState<TransactionActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  const initialType = (values?.type as TransactionType) ?? defaults.type;
  const [type, setType] = useState<TransactionType>(initialType);

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="occurredOn">日期</Label>
            <Input
              id="occurredOn"
              name="occurredOn"
              type="date"
              required
              defaultValue={values?.occurredOn ?? defaults.occurredOn ?? todayIsoDate()}
              className="h-11 text-base"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="amount">金额</Label>
            <Input
              id="amount"
              name="amount"
              inputMode="decimal"
              required
              placeholder="例如：1200"
              defaultValue={values?.amount ?? defaults.amount ?? ""}
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
              defaultValue={values?.currency ?? defaults.currency}
            >
              {currencies.map((currency) => (
                <option value={currency} key={currency}>
                  {currency} · {currencyLabels[currency]}
                </option>
              ))}
            </NativeSelect>
          </div>
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

        {/* 始终渲染来源 / 目标 input，但不需要时隐藏；这样 form 提交时 name 还在，action 端继续工作 */}
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
              选择后会自动把支付方式的默认资金来源填到{fieldConfig.sourceLabel}
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

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
