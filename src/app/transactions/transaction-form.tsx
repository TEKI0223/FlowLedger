"use client";

import { useActionState } from "react";
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
  paymentMethods: Array<{ id: string; name: string }>;
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
  action: (
    prev: TransactionActionState,
    formData: FormData,
  ) => Promise<TransactionActionState>;
  lookups: Lookups;
  defaults: Defaults;
  submitLabel: string;
};

export function TransactionForm({ action, lookups, defaults, submitLabel }: TransactionFormProps) {
  const [state, formAction] = useActionState<TransactionActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

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
              defaultValue={values?.type ?? defaults.type}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="sourceAccountId">来源账户</Label>
            <NativeSelect
              id="sourceAccountId"
              name="sourceAccountId"
              defaultValue={values?.sourceAccountId ?? defaults.sourceAccountId ?? ""}
            >
              <option value="">不选择</option>
              {lookups.accounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name} · {account.currency}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetAccountId">目标账户</Label>
            <NativeSelect
              id="targetAccountId"
              name="targetAccountId"
              defaultValue={values?.targetAccountId ?? defaults.targetAccountId ?? ""}
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

        <div className="grid gap-2">
          <Label htmlFor="paymentMethodId">支付方式</Label>
          <NativeSelect
            id="paymentMethodId"
            name="paymentMethodId"
            defaultValue={values?.paymentMethodId ?? defaults.paymentMethodId ?? ""}
          >
            <option value="">不选择</option>
            {lookups.paymentMethods.map((paymentMethod) => (
              <option value={paymentMethod.id} key={paymentMethod.id}>
                {paymentMethod.name}
              </option>
            ))}
          </NativeSelect>
        </div>

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
