"use client";

import { useActionState } from "react";
import { updateAccount, type AccountActionState } from "@/app/actions/accounts";

const initialState: AccountActionState = {};
import { InlineAlert } from "@/components/ui/inline-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  accountTypeLabels,
  currencies,
  currencyLabels,
  type AccountType,
  type Currency,
} from "@/domain/finance";

type EditAccountFormProps = {
  account: {
    id: string;
    name: string;
    type: AccountType;
    currency: Currency;
    includeInNetWorth: boolean;
    note: string | null;
  };
};

export function EditAccountForm({ account }: EditAccountFormProps) {
  const action = updateAccount.bind(null, account.id);
  const [state, formAction] = useActionState<AccountActionState, FormData>(action, initialState);
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="form-grid">
        <label>
          <span>账户名称</span>
          <input name="name" required defaultValue={values?.name ?? account.name} />
        </label>

        <label>
          <span>账户类型</span>
          <select name="type" required defaultValue={values?.type ?? account.type}>
            {Object.entries(accountTypeLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>币种</span>
          <select name="currency" required defaultValue={values?.currency ?? account.currency}>
            {currencies.map((currency) => (
              <option value={currency} key={currency}>
                {currency} · {currencyLabels[currency]}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input
            name="includeInNetWorth"
            type="checkbox"
            defaultChecked={values?.includeInNetWorth ?? account.includeInNetWorth}
          />
          <span>计入净资产</span>
        </label>

        <label>
          <span>备注</span>
          <textarea
            name="note"
            rows={4}
            defaultValue={values?.note ?? account.note ?? ""}
          />
        </label>

        <SubmitButton>保存修改</SubmitButton>
      </form>
    </>
  );
}
