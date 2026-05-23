"use client";

import { useActionState, useState } from "react";
import type { InstallmentActionState } from "@/app/actions/installments";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  currencies,
  currencyLabels,
  formatMinorForInput,
  parseMoneyToMinor,
  type Currency,
} from "@/domain/finance";

const initialState: InstallmentActionState = {};

type Defaults = {
  totalAmount?: string;
  currency?: Currency;
  periods?: string;
  amountPerPeriod?: string;
  firstPaymentOn?: string;
  feeAmount?: string;
};

type InstallmentFormProps = {
  action: (
    prev: InstallmentActionState,
    formData: FormData,
  ) => Promise<InstallmentActionState>;
  defaults?: Defaults;
  submitLabel: string;
};

export function InstallmentForm({ action, defaults = {}, submitLabel }: InstallmentFormProps) {
  const [state, formAction] = useActionState<InstallmentActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  const [currency, setCurrency] = useState<Currency>(
    (values?.currency as Currency) ?? defaults.currency ?? "JPY",
  );
  const [totalAmount, setTotalAmount] = useState<string>(
    values?.totalAmount ?? defaults.totalAmount ?? "",
  );
  const [periods, setPeriods] = useState<string>(values?.periods ?? defaults.periods ?? "12");
  const [amountPerPeriod, setAmountPerPeriod] = useState<string>(
    values?.amountPerPeriod ?? defaults.amountPerPeriod ?? "",
  );

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const v = state.values;
    if (v?.currency) setCurrency(v.currency as Currency);
    if (v?.totalAmount !== undefined) setTotalAmount(v.totalAmount);
    if (v?.periods !== undefined) setPeriods(v.periods);
    if (v?.amountPerPeriod !== undefined) setAmountPerPeriod(v.amountPerPeriod);
  }

  // 估算每期金额（用户没填时基于 totalAmount / periods）
  const suggested = (() => {
    if (amountPerPeriod) return null;
    const n = Number.parseInt(periods, 10);
    if (!Number.isFinite(n) || n < 2) return null;
    try {
      const totalMinor = parseMoneyToMinor(totalAmount, currency);
      const per = Math.floor(totalMinor / n);
      if (per <= 0) return null;
      return formatMinorForInput({ amountMinor: per, currency });
    } catch {
      return null;
    }
  })();

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor="totalAmount">总金额</Label>
            <MoneyInput
              id="totalAmount"
              name="totalAmount"
              required
              placeholder="例如：120,000"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="periods">期数</Label>
            <Input
              id="periods"
              name="periods"
              type="number"
              min={2}
              required
              value={periods}
              onChange={(event) => setPeriods(event.target.value)}
              className="h-11 text-base tabular-nums"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amountPerPeriod">每期金额</Label>
            <MoneyInput
              id="amountPerPeriod"
              name="amountPerPeriod"
              required
              placeholder={suggested ? `建议：${suggested}` : "例如：10,000"}
              value={amountPerPeriod}
              onChange={(event) => setAmountPerPeriod(event.target.value)}
              className="h-11 text-base tabular-nums"
            />
            {suggested && !amountPerPeriod ? (
              <p className="text-xs text-muted-foreground">
                平均：{suggested}（点上面金额会自动填入）
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="firstPaymentOn">首期扣款日期</Label>
          <Input
            id="firstPaymentOn"
            name="firstPaymentOn"
            type="date"
            required
            defaultValue={values?.firstPaymentOn ?? defaults.firstPaymentOn ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="feeAmount">手续费 / 利息总额（可选）</Label>
          <MoneyInput
            id="feeAmount"
            name="feeAmount"
            placeholder="例如：1,200"
            defaultValue={values?.feeAmount ?? defaults.feeAmount ?? ""}
            className="h-11 text-base tabular-nums"
          />
        </div>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
