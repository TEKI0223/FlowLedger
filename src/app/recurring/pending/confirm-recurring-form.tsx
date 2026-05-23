"use client";

import { useActionState } from "react";
import {
  confirmRecurringItem,
  skipRecurringItem,
  type ConfirmActionState,
} from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

const initialState: ConfirmActionState = {};

type ConfirmRecurringFormProps = {
  itemId: string;
  occurredOnDefault: string;
  amountDefault: string;
  amountFixed: boolean;
  noteDefault: string;
};

export function ConfirmRecurringForm({
  itemId,
  occurredOnDefault,
  amountDefault,
  amountFixed,
  noteDefault,
}: ConfirmRecurringFormProps) {
  const action = confirmRecurringItem.bind(null, itemId);
  const [state, formAction] = useActionState<ConfirmActionState, FormData>(action, initialState);
  const values = state.values;

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label htmlFor={`amount-${itemId}`}>金额</Label>
            <Input
              id={`amount-${itemId}`}
              name="amount"
              inputMode="decimal"
              required={!amountFixed}
              placeholder={amountFixed ? amountDefault : "请输入实际金额"}
              defaultValue={values?.amount ?? amountDefault}
              className="h-11 text-base tabular-nums"
            />
          </div>
          <div className="grid gap-2 sm:w-44">
            <Label htmlFor={`occurredOn-${itemId}`}>发生日期</Label>
            <Input
              id={`occurredOn-${itemId}`}
              name="occurredOn"
              type="date"
              required
              defaultValue={values?.occurredOn ?? occurredOnDefault}
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`note-${itemId}`}>备注</Label>
          <Textarea
            id={`note-${itemId}`}
            name="note"
            rows={2}
            placeholder="可选"
            defaultValue={values?.note ?? noteDefault}
            className="text-base"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <SubmitButton>确认并记账</SubmitButton>
          <SkipButton itemId={itemId} />
        </div>
      </form>
    </>
  );
}

function SkipButton({ itemId }: { itemId: string }) {
  return (
    <form action={skipRecurringItem.bind(null, itemId)}>
      <Button
        type="submit"
        variant="ghost"
        size="lg"
        className="h-11 w-full text-sm text-muted-foreground"
      >
        跳过本期
      </Button>
    </form>
  );
}
