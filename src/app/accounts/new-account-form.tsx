"use client";

import { useActionState } from "react";
import { createAccount, type AccountActionState } from "@/app/actions/accounts";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { accountTypeLabels, currencies, currencyLabels } from "@/domain/finance";

const initialState: AccountActionState = {};

export function NewAccountForm() {
  const [state, formAction] = useActionState<AccountActionState, FormData>(
    createAccount,
    initialState,
  );
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">账户名称</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="例如：日本银行账户"
            defaultValue={values?.name ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="type">账户类型</Label>
          <NativeSelect id="type" name="type" required defaultValue={values?.type ?? "bank"}>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
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
            defaultValue={values?.currency ?? "JPY"}
          >
            {currencies.map((currency) => (
              <option value={currency} key={currency}>
                {currency} · {currencyLabels[currency]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="initialBalance">初始余额</Label>
          <MoneyInput
            id="initialBalance"
            name="initialBalance"
            placeholder="0"
            defaultValue={values?.initialBalance ?? "0"}
            className="h-11 text-base tabular-nums"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="includeInNetWorth"
            type="checkbox"
            defaultChecked={values?.includeInNetWorth ?? true}
            className="size-4 rounded border-input accent-primary"
          />
          <span>计入净资产</span>
        </label>

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            placeholder="可选"
            defaultValue={values?.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>保存账户</SubmitButton>
      </form>
    </>
  );
}
