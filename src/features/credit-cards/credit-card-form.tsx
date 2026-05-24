"use client";

import { useActionState } from "react";
import type { CreditCardActionState } from "@/app/actions/credit-cards";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { currencies, currencyLabels, formatMinorForInput, type Currency } from "@/domain/finance";
import type { CycleBoundary } from "@/domain/credit-card";
import { formatAccountName } from "@/features/accounts/labels";

const initialState: CreditCardActionState = {};

type RepaymentAccountOption = {
  id: string;
  name: string;
  lastDigits: string | null;
  currency: Currency;
};

type CreditCardFormProps = {
  action: (prev: CreditCardActionState, formData: FormData) => Promise<CreditCardActionState>;
  repaymentAccounts: RepaymentAccountOption[];
  defaults?: {
    name?: string;
    lastDigits?: string | null;
    currency?: Currency;
    balanceMinor?: number;
    closingDay?: number;
    paymentDay?: number;
    cycleBoundary?: CycleBoundary;
    repaymentAccountId?: string | null;
    enabled?: boolean;
    note?: string | null;
  };
  submitLabel: string;
};

export function CreditCardForm({
  action,
  repaymentAccounts,
  defaults,
  submitLabel,
}: CreditCardFormProps) {
  const [state, formAction] = useActionState<CreditCardActionState, FormData>(action, initialState);
  const values = state.values;
  const defaultCurrency = defaults?.currency ?? "JPY";
  const currentDebtDefault =
    defaults?.balanceMinor === undefined
      ? ""
      : formatMinorForInput({
          amountMinor: Math.abs(defaults.balanceMinor),
          currency: defaultCurrency,
        });

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">信用卡名称</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="例如：三井住友信用卡"
            defaultValue={values?.name ?? defaults?.name ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="lastDigits">尾号</Label>
            <Input
              id="lastDigits"
              name="lastDigits"
              maxLength={8}
              placeholder="可选，例如 1234"
              defaultValue={values?.lastDigits ?? defaults?.lastDigits ?? ""}
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">币种</Label>
            <NativeSelect
              id="currency"
              name="currency"
              required
              defaultValue={values?.currency ?? defaultCurrency}
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
          <Label htmlFor="currentDebt">当前欠款</Label>
          <MoneyInput
            id="currentDebt"
            name="currentDebt"
            placeholder="可留空，欠款会存为负余额"
            defaultValue={values?.currentDebt ?? currentDebtDefault}
            className="h-11 text-base tabular-nums"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="closingDay">账单日</Label>
            <Input
              id="closingDay"
              name="closingDay"
              type="number"
              min={1}
              max={31}
              required
              defaultValue={values?.closingDay ?? defaults?.closingDay ?? 25}
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentDay">扣款日</Label>
            <Input
              id="paymentDay"
              name="paymentDay"
              type="number"
              min={1}
              max={31}
              required
              defaultValue={values?.paymentDay ?? defaults?.paymentDay ?? 10}
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cycleBoundary">账单日归属</Label>
          <NativeSelect
            id="cycleBoundary"
            name="cycleBoundary"
            required
            defaultValue={values?.cycleBoundary ?? defaults?.cycleBoundary ?? "inclusive"}
          >
            <option value="inclusive">账单日当天计入本期</option>
            <option value="exclusive">账单日当天计入下期</option>
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="repaymentAccountId">默认还款账户</Label>
          <NativeSelect
            id="repaymentAccountId"
            name="repaymentAccountId"
            defaultValue={values?.repaymentAccountId ?? defaults?.repaymentAccountId ?? ""}
          >
            <option value="">暂不设置</option>
            {repaymentAccounts.map((account) => (
              <option value={account.id} key={account.id}>
                {formatAccountName(account)} · {account.currency}
              </option>
            ))}
          </NativeSelect>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="enabled"
            type="checkbox"
            defaultChecked={values?.enabled ?? defaults?.enabled ?? true}
            className="size-4 rounded border-input accent-primary"
          />
          <span>启用（同时启用对应支付方式）</span>
        </label>

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={values?.note ?? defaults?.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
