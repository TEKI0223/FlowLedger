"use client";

import { useActionState } from "react";
import type { ExchangeRateActionState } from "@/app/actions/exchange-rates";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState: ExchangeRateActionState = {};

type RateFormProps = {
  action: (prev: ExchangeRateActionState, formData: FormData) => Promise<ExchangeRateActionState>;
  defaultCnyToJpy: string;
};

export function RateForm({ action, defaultCnyToJpy }: RateFormProps) {
  const [state, formAction] = useActionState<ExchangeRateActionState, FormData>(
    action,
    initialState,
  );

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="cnyToJpy">1 CNY = ? JPY</Label>
          <Input
            id="cnyToJpy"
            name="cnyToJpy"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.0001"
            required
            defaultValue={state.values?.cnyToJpy ?? defaultCnyToJpy}
            className="h-12 text-xl font-semibold tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            首页净资产会用这个汇率把人民币资产折算为日元。
          </p>
        </div>

        <SubmitButton>保存汇率</SubmitButton>
      </form>
    </>
  );
}
