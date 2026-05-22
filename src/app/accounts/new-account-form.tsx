"use client";

import { useActionState } from "react";
import { createAccount, type AccountActionState } from "@/app/actions/accounts";

const initialState: AccountActionState = {};
import { InlineAlert } from "@/components/ui/inline-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { accountTypeLabels, currencies, currencyLabels } from "@/domain/finance";

export function NewAccountForm() {
  const [state, formAction] = useActionState<AccountActionState, FormData>(
    createAccount,
    initialState,
  );
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="form-grid">
        <label>
          <span>账户名称</span>
          <input
            name="name"
            required
            placeholder="例如：日本银行账户"
            defaultValue={values?.name ?? ""}
          />
        </label>

        <label>
          <span>账户类型</span>
          <select name="type" required defaultValue={values?.type ?? "bank"}>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>币种</span>
          <select name="currency" required defaultValue={values?.currency ?? "JPY"}>
            {currencies.map((currency) => (
              <option value={currency} key={currency}>
                {currency} · {currencyLabels[currency]}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>初始余额</span>
          <input
            name="initialBalance"
            inputMode="decimal"
            placeholder="0"
            defaultValue={values?.initialBalance ?? "0"}
          />
        </label>

        <label className="checkbox-row">
          <input
            name="includeInNetWorth"
            type="checkbox"
            defaultChecked={values?.includeInNetWorth ?? true}
          />
          <span>计入净资产</span>
        </label>

        <label>
          <span>备注</span>
          <textarea name="note" rows={3} placeholder="可选" defaultValue={values?.note ?? ""} />
        </label>

        <SubmitButton>保存账户</SubmitButton>
      </form>
    </>
  );
}
