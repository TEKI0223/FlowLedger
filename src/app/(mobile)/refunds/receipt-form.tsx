"use client";

import { useActionState } from "react";
import { recordRefundReceipt, type ReceiptActionState } from "@/app/actions/refunds";
import { DatePicker } from "@/components/ui/date-picker";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatMinorForInput, type Currency } from "@/domain/finance";
import { formatAccountName } from "@/features/accounts/labels";

const initialState: ReceiptActionState = {};

type ReceiptFormProps = {
  trackerId: string;
  currency: Currency;
  remainingMinor: number;
  expectedAccountId: string | null;
  todayIso: string;
  accounts: Array<{ id: string; name: string; lastDigits: string | null; currency: Currency }>;
};

export function ReceiptForm({
  trackerId,
  currency,
  remainingMinor,
  expectedAccountId,
  todayIso,
  accounts,
}: ReceiptFormProps) {
  const action = recordRefundReceipt.bind(null, trackerId);
  const [state, formAction] = useActionState<ReceiptActionState, FormData>(action, initialState);
  const values = state.values;

  const amountDefault = formatMinorForInput({ amountMinor: remainingMinor, currency });
  const filteredAccounts = accounts.filter((a) => a.currency === currency);

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor={`receipt-amount-${trackerId}`}>到账金额</Label>
            <MoneyInput
              id={`receipt-amount-${trackerId}`}
              name="amount"
              required
              placeholder={amountDefault}
              defaultValue={values?.amount ?? amountDefault}
              className="h-11 text-base tabular-nums"
            />
          </div>
          <div className="grid gap-2 sm:w-44">
            <Label htmlFor={`receipt-date-${trackerId}`}>到账日期</Label>
            <DatePicker
              id={`receipt-date-${trackerId}`}
              name="occurredOn"
              required
              defaultValue={values?.occurredOn ?? todayIso}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`receipt-account-${trackerId}`}>到账账户</Label>
          <NativeSelect
            id={`receipt-account-${trackerId}`}
            name="targetAccountId"
            required
            defaultValue={values?.targetAccountId ?? expectedAccountId ?? ""}
          >
            <option value="" disabled>
              选择账户
            </option>
            {filteredAccounts.map((account) => (
              <option value={account.id} key={account.id}>
                {formatAccountName(account)} · {account.currency}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`receipt-note-${trackerId}`}>备注</Label>
          <Textarea
            id={`receipt-note-${trackerId}`}
            name="note"
            rows={2}
            placeholder="可选"
            defaultValue={values?.note ?? ""}
            className="text-base"
          />
        </div>

        <SubmitButton>记录到账</SubmitButton>
      </form>
    </>
  );
}
