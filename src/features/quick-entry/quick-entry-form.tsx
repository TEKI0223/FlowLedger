"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import {
  createQuickEntryTransaction,
  createTemporaryTransaction,
  type TransactionActionState,
} from "@/app/actions/transactions";

const initialState: TransactionActionState = {};
import { InlineAlert } from "@/components/ui/inline-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Currency } from "@/domain/finance";
import { todayIsoDate } from "@/lib/dates";

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
  const submitLabel =
    props.submitLabel ?? (props.mode === "temporary" ? "保存临时记录" : "保存");

  return (
    <>
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form action={formAction} className="quick-entry-form">
        <label className="amount-field">
          <span>金额</span>
          <input
            ref={amountInputRef}
            name="amount"
            inputMode="decimal"
            required
            placeholder={currency === "JPY" ? "1200" : "38.50"}
            defaultValue={amountDefault}
          />
        </label>

        <div className="compact-form-grid">
          <label>
            <span>日期</span>
            <input name="occurredOn" type="date" required defaultValue={occurredOnDefault} />
          </label>
          <label>
            <span>币种</span>
            <input value={currency} readOnly aria-label="币种" />
          </label>
        </div>

        <label>
          <span>备注</span>
          <textarea
            name="note"
            rows={3}
            placeholder={
              props.mode === "template" ? (props.noteHint ?? "可选") : "可选，例如店名或用途"
            }
            defaultValue={noteDefault}
          />
        </label>

        {props.mode === "temporary" ? (
          <div className="quick-entry-preview">保存为 JPY 支出 · 待补全</div>
        ) : null}

        <div className="quick-entry-actions">
          <SubmitButton>{submitLabel}</SubmitButton>
          {showFullEntryLink ? (
            <Link className="secondary-action" href="/transactions">
              完整录入
            </Link>
          ) : null}
        </div>
      </form>
    </>
  );
}
