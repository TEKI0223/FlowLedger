"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import {
  createQuickEntryTransaction,
  createTemporaryTransaction,
  type TransactionActionState,
} from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { Currency } from "@/domain/finance";
import { todayIsoDate } from "@/lib/dates";

const initialState: TransactionActionState = {};

type QuickEntryFormProps =
  | {
      mode: "template";
      templateId: string;
      currency: Currency;
      amountDefault?: string;
      noteHint?: string;
      autoFocusAmount?: boolean;
      submitLabel?: string;
      showFullEntryLink?: boolean;
    }
  | {
      mode: "temporary";
      autoFocusAmount?: boolean;
      submitLabel?: string;
      showFullEntryLink?: boolean;
    };

export function QuickEntryForm(props: QuickEntryFormProps) {
  const action =
    props.mode === "template"
      ? createQuickEntryTransaction.bind(null, props.templateId)
      : createTemporaryTransaction;

  const [state, formAction] = useActionState<TransactionActionState, FormData>(
    action,
    initialState,
  );
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.autoFocusAmount) {
      amountInputRef.current?.focus();
    }
  }, [props.autoFocusAmount]);

  const currency = props.mode === "template" ? props.currency : "JPY";
  const amountDefault =
    props.mode === "template"
      ? (state.values?.amount ?? props.amountDefault ?? "")
      : (state.values?.amount ?? "");
  const noteDefault = state.values?.note ?? "";
  const occurredOnDefault = state.values?.occurredOn ?? todayIsoDate();
  const showFullEntryLink = props.showFullEntryLink ?? true;
  const submitLabel = props.submitLabel ?? (props.mode === "temporary" ? "保存临时记录" : "保存");

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="quick-amount">金额</Label>
          <MoneyInput
            id="quick-amount"
            ref={amountInputRef}
            name="amount"
            required
            placeholder={currency === "JPY" ? "1,200" : "38.50"}
            defaultValue={amountDefault}
            className="h-16 text-3xl font-semibold tabular-nums"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="quick-occurredOn">日期</Label>
            <Input
              id="quick-occurredOn"
              name="occurredOn"
              type="date"
              required
              defaultValue={occurredOnDefault}
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quick-currency">币种</Label>
            <Input
              id="quick-currency"
              value={currency}
              readOnly
              aria-label="币种"
              className="h-11 text-base"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="quick-note">备注</Label>
          <Textarea
            id="quick-note"
            name="note"
            rows={3}
            placeholder={
              props.mode === "template" ? (props.noteHint ?? "可选") : "可选，例如店名或用途"
            }
            defaultValue={noteDefault}
            className="text-base"
          />
        </div>

        {props.mode === "temporary" ? (
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            保存为 JPY 支出 · 待补全
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <SubmitButton>{submitLabel}</SubmitButton>
          {showFullEntryLink ? (
            <Link
              href="/transactions"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 text-base")}
            >
              完整录入
            </Link>
          ) : null}
        </div>
      </form>
    </>
  );
}
