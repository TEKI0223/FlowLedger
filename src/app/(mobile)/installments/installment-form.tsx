"use client";

import { useActionState, useState } from "react";
import type { InstallmentActionState } from "@/app/actions/installments";
import { MoneyText } from "@/components/privacy/money-text";
import { DatePicker } from "@/components/ui/date-picker";
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
import { classifyInstallmentFee } from "@/domain/installment";

const initialState: InstallmentActionState = {};

type Defaults = {
  totalAmount?: string;
  currency?: Currency;
  periods?: string;
  amountPerPeriod?: string;
  firstPaymentOn?: string;
};

type InstallmentFormProps = {
  action: (prev: InstallmentActionState, formData: FormData) => Promise<InstallmentActionState>;
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

  // 每期金额：默认根据总额 / 期数自动算；用户手动改后就不再覆盖
  const initialPerPeriod = values?.amountPerPeriod ?? defaults.amountPerPeriod ?? "";
  const [manualPerPeriod, setManualPerPeriod] = useState(initialPerPeriod);
  const [userEditedPerPeriod, setUserEditedPerPeriod] = useState(Boolean(initialPerPeriod));

  // render 阶段同步 action 返回的 values（错误回填）
  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    const v = state.values;
    if (v?.currency) setCurrency(v.currency as Currency);
    if (v?.totalAmount !== undefined) setTotalAmount(v.totalAmount);
    if (v?.periods !== undefined) setPeriods(v.periods);
    if (v?.amountPerPeriod !== undefined) {
      setManualPerPeriod(v.amountPerPeriod);
      if (v.amountPerPeriod) setUserEditedPerPeriod(true);
    }
  }

  const periodsNum = Number.parseInt(periods, 10);
  const autoPerPeriod = computeAutoPerPeriod(totalAmount, periodsNum, currency);
  const amountPerPeriod = userEditedPerPeriod ? manualPerPeriod : autoPerPeriod;

  // 利息（手续费）= 期数 × 每期金额 − 总金额；
  // 容差：rounding 误差视为 0（见 classifyInstallmentFee）
  const rawFeeMinor = computeRawFee(totalAmount, periodsNum, amountPerPeriod, currency);
  const interestSummary =
    rawFeeMinor === null ? null : classifyInstallmentFee(rawFeeMinor, periodsNum);

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
              placeholder="例如：10,000"
              value={amountPerPeriod}
              onChange={(event) => {
                setManualPerPeriod(event.target.value);
                setUserEditedPerPeriod(true);
              }}
              className="h-11 text-base tabular-nums"
            />
            {!userEditedPerPeriod && autoPerPeriod ? (
              <p className="text-xs text-muted-foreground">
                自动计算：总额 ÷ 期数。可手动改成实际扣款额。
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="firstPaymentOn">首期扣款日期</Label>
          <DatePicker
            id="firstPaymentOn"
            name="firstPaymentOn"
            required
            defaultValue={values?.firstPaymentOn ?? defaults.firstPaymentOn ?? ""}
          />
        </div>

        {interestSummary ? (
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm">
            {interestSummary.kind === "none" ? (
              <p className="text-muted-foreground">无利息分期</p>
            ) : interestSummary.kind === "interest" ? (
              <p>
                <span className="text-muted-foreground">利息：</span>
                <span className="font-semibold tabular-nums text-adjustment">
                  每期 +
                  <MoneyText amountMinor={interestSummary.perPeriodMinor} currency={currency} />
                </span>
                <span className="text-muted-foreground">{" · "}总 </span>
                <span className="font-semibold tabular-nums text-adjustment">
                  <MoneyText amountMinor={interestSummary.totalMinor} currency={currency} />
                </span>
              </p>
            ) : (
              <p>
                <span className="text-muted-foreground">回扣 / 折让：</span>
                <span className="font-semibold tabular-nums text-income">
                  每期 −
                  <MoneyText amountMinor={interestSummary.perPeriodMinor} currency={currency} />
                </span>
                <span className="text-muted-foreground">{" · "}总 </span>
                <span className="font-semibold tabular-nums text-income">
                  <MoneyText amountMinor={interestSummary.totalMinor} currency={currency} />
                </span>
              </p>
            )}
          </div>
        ) : null}

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}

function computeAutoPerPeriod(totalAmount: string, periods: number, currency: Currency): string {
  if (!totalAmount || !Number.isFinite(periods) || periods < 1) return "";
  try {
    const totalMinor = parseMoneyToMinor(totalAmount, currency);
    if (totalMinor <= 0) return "";
    const per = Math.floor(totalMinor / periods);
    if (per <= 0) return "";
    return formatMinorForInput({ amountMinor: per, currency });
  } catch {
    return "";
  }
}

function computeRawFee(
  totalAmount: string,
  periods: number,
  amountPerPeriod: string,
  currency: Currency,
): number | null {
  if (!totalAmount || !amountPerPeriod) return null;
  if (!Number.isFinite(periods) || periods < 1) return null;
  try {
    const totalMinor = parseMoneyToMinor(totalAmount, currency);
    const perMinor = parseMoneyToMinor(amountPerPeriod, currency);
    if (totalMinor <= 0 || perMinor <= 0) return null;
    return periods * perMinor - totalMinor;
  } catch {
    return null;
  }
}
