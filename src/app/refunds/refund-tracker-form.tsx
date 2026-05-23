"use client";

import { useActionState, useState } from "react";
import type { RefundTrackerActionState } from "@/app/actions/refunds";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { currencies, currencyLabels, type Currency } from "@/domain/finance";

const initialState: RefundTrackerActionState = {};

type Lookups = {
  accounts: Array<{ id: string; name: string; currency: Currency }>;
};

type Defaults = {
  amount?: string;
  currency?: Currency;
  expectedAccountId?: string;
  expectedOn?: string;
  note?: string;
};

type RefundTrackerFormProps = {
  action: (prev: RefundTrackerActionState, formData: FormData) => Promise<RefundTrackerActionState>;
  lookups: Lookups;
  defaults?: Defaults;
  submitLabel: string;
};

export function RefundTrackerForm({
  action,
  lookups,
  defaults = {},
  submitLabel,
}: RefundTrackerFormProps) {
  const [state, formAction] = useActionState<RefundTrackerActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  const [currency, setCurrency] = useState<Currency>(
    (values?.currency as Currency) ?? defaults.currency ?? "JPY",
  );

  // 与 TransactionForm 一致：render 阶段反向同步 action 返回的 values
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.values?.currency) {
      setCurrency(state.values.currency as Currency);
    }
  }

  // 按币种过滤可选到账账户
  const accountsForCurrency = lookups.accounts.filter((a) => a.currency === currency);

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="amount">应退金额</Label>
            <MoneyInput
              id="amount"
              name="amount"
              required
              placeholder="例如：1,500"
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

        <div className="grid gap-2">
          <Label htmlFor="expectedAccountId">预计到账账户</Label>
          <NativeSelect
            id="expectedAccountId"
            name="expectedAccountId"
            defaultValue={values?.expectedAccountId ?? defaults.expectedAccountId ?? ""}
          >
            <option value="">不指定</option>
            {accountsForCurrency.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name} · {account.currency}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expectedOn">预计到账日期</Label>
          <Input
            id="expectedOn"
            name="expectedOn"
            type="date"
            defaultValue={values?.expectedOn ?? defaults.expectedOn ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            placeholder="可选，例如商家、订单号"
            defaultValue={values?.note ?? defaults.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
