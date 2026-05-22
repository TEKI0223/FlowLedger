"use client";

import { useActionState } from "react";
import { updateAccount, type AccountActionState } from "@/app/actions/accounts";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  accountTypeLabels,
  currencies,
  currencyLabels,
  type AccountType,
  type Currency,
} from "@/domain/finance";

const initialState: AccountActionState = {};

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
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">账户名称</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={values?.name ?? account.name}
            className="h-11 text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="type">账户类型</Label>
          <NativeSelect id="type" name="type" required defaultValue={values?.type ?? account.type}>
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
            defaultValue={values?.currency ?? account.currency}
          >
            {currencies.map((currency) => (
              <option value={currency} key={currency}>
                {currency} · {currencyLabels[currency]}
              </option>
            ))}
          </NativeSelect>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            name="includeInNetWorth"
            type="checkbox"
            defaultChecked={values?.includeInNetWorth ?? account.includeInNetWorth}
            className="size-4 rounded border-input accent-primary"
          />
          <span>计入净资产</span>
        </label>

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={4}
            defaultValue={values?.note ?? account.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>保存修改</SubmitButton>
      </form>
    </>
  );
}
