"use client";

import { useActionState } from "react";
import type { PaymentMethodActionState } from "@/app/actions/payment-methods";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  currencies,
  currencyLabels,
  paymentMethodTypeLabels,
  paymentMethodTypes,
  type Currency,
  type PaymentMethodType,
} from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";

const initialState: PaymentMethodActionState = {};

type AccountOption = {
  id: string;
  name: string;
  lastDigits: string | null;
  currency: Currency;
};

type PaymentMethodFormProps = {
  action: (prev: PaymentMethodActionState, formData: FormData) => Promise<PaymentMethodActionState>;
  accounts: AccountOption[];
  defaults?: {
    name?: string;
    type?: PaymentMethodType;
    currency?: Currency;
    defaultAccountId?: string | null;
    enabled?: boolean;
    note?: string | null;
  };
  submitLabel: string;
};

export function PaymentMethodForm({
  action,
  accounts,
  defaults,
  submitLabel,
}: PaymentMethodFormProps) {
  const [state, formAction] = useActionState<PaymentMethodActionState, FormData>(
    action,
    initialState,
  );
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">支付方式名称</Label>
          <Input
            id="name"
            name="name"
            required
            placeholder="例如：Apple Pay"
            defaultValue={values?.name ?? defaults?.name ?? ""}
            className="h-11 text-base"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="type">类型</Label>
            <NativeSelect
              id="type"
              name="type"
              required
              defaultValue={values?.type ?? defaults?.type ?? "other"}
            >
              {paymentMethodTypes.map((type) => (
                <option value={type} key={type}>
                  {paymentMethodTypeLabels[type]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="currency">默认币种</Label>
            <NativeSelect
              id="currency"
              name="currency"
              required
              defaultValue={values?.currency ?? defaults?.currency ?? "JPY"}
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
          <Label htmlFor="defaultAccountId">默认资金来源</Label>
          <NativeSelect
            id="defaultAccountId"
            name="defaultAccountId"
            defaultValue={values?.defaultAccountId ?? defaults?.defaultAccountId ?? ""}
          >
            <option value="">暂不设置</option>
            {accounts.map((account) => (
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
          <span>启用</span>
        </label>

        <div className="grid gap-2">
          <Label htmlFor="note">备注</Label>
          <Textarea
            id="note"
            name="note"
            rows={4}
            placeholder="可选，例如绑定卡、使用场景"
            defaultValue={values?.note ?? defaults?.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>{submitLabel}</SubmitButton>
      </form>
    </>
  );
}
