"use client";

import { useActionState } from "react";
import type { TransactionActionState } from "@/app/actions/transactions";

const initialState: TransactionActionState = {};
import { InlineAlert } from "@/components/ui/inline-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  currencies,
  currencyLabels,
  transactionTypeLabels,
  type Currency,
  type TransactionType,
} from "@/domain/finance";
import { todayIsoDate } from "@/lib/dates";

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
      <form action={formAction} className="form-grid">
        <label>
          <span>日期</span>
          <input
            name="occurredOn"
            type="date"
            required
            defaultValue={values?.occurredOn ?? defaults.occurredOn ?? todayIsoDate()}
          />
        </label>

        <label>
          <span>类型</span>
          <select name="type" required defaultValue={values?.type ?? defaults.type}>
            {Object.entries(transactionTypeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>金额</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            placeholder="例如：1200"
            defaultValue={values?.amount ?? defaults.amount ?? ""}
          />
        </label>

        <label>
          <span>币种</span>
          <select name="currency" required defaultValue={values?.currency ?? defaults.currency}>
            {currencies.map((currency) => (
              <option value={currency} key={currency}>
                {currency} · {currencyLabels[currency]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>分类</span>
          <select name="categoryId" defaultValue={values?.categoryId ?? defaults.categoryId ?? ""}>
            <option value="">无分类</option>
            {lookups.categories.map((category) => (
              <option value={category.id} key={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>来源账户</span>
          <select
            name="sourceAccountId"
            defaultValue={values?.sourceAccountId ?? defaults.sourceAccountId ?? ""}
          >
            <option value="">不选择</option>
            {lookups.accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>目标账户</span>
          <select
            name="targetAccountId"
            defaultValue={values?.targetAccountId ?? defaults.targetAccountId ?? ""}
          >
            <option value="">不选择</option>
            {lookups.accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>支付方式</span>
          <select
            name="paymentMethodId"
            defaultValue={values?.paymentMethodId ?? defaults.paymentMethodId ?? ""}
          >
            <option value="">不选择</option>
            {lookups.paymentMethods.map((paymentMethod) => (
              <option value={paymentMethod.id} key={paymentMethod.id}>
                {paymentMethod.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>备注</span>
          <textarea
            name="note"
            rows={3}
            placeholder="可选"
            defaultValue={values?.note ?? defaults.note ?? ""}
          />
        </label>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
