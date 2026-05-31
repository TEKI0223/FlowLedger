"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ScissorsIcon, StickyNoteIcon } from "lucide-react";
import {
  createQuickEntryTransaction,
  createTemporaryTransaction,
  type TransactionActionState,
} from "@/app/actions/transactions";
import { DatePicker } from "@/components/ui/date-picker";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { Currency } from "@/domain/finance";
import type { CategoryPickerOption } from "@/features/categories/category-picker";
import { SplitsField } from "@/features/transactions/splits-field";
import { todayIsoDate } from "@/lib/dates";

const initialState: TransactionActionState = {};

type QuickEntryFormProps =
  | {
      mode: "template";
      templateId: string;
      currency: Currency;
      amountDefault?: string;
      noteDefault?: string;
      noteHint?: string;
      autoFocusAmount?: boolean;
      submitLabel?: string;
      showTemplateEditLink?: boolean;
      templateCategoryId?: string | null;
      templateCategoryLabel?: string | null;
      templateType?: "income" | "expense" | "transfer" | "adjustment" | "temporary";
      categories?: CategoryPickerOption[];
    }
  | {
      mode: "temporary";
      autoFocusAmount?: boolean;
      submitLabel?: string;
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
  const formRef = useRef<HTMLFormElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (props.autoFocusAmount) {
      amountInputRef.current?.focus();
    }
  }, [props.autoFocusAmount]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      amountInputRef.current?.focus();
    }
  }, [state.success]);

  const currency = props.mode === "template" ? props.currency : "JPY";
  const amountDefault =
    props.mode === "template"
      ? (state.values?.amount ?? props.amountDefault ?? "")
      : (state.values?.amount ?? "");
  const noteDefault =
    props.mode === "template"
      ? (state.values?.note ?? props.noteDefault ?? "")
      : (state.values?.note ?? "");
  const occurredOnDefault = state.values?.occurredOn ?? todayIsoDate();
  const showTemplateEditLink =
    props.mode === "template" ? (props.showTemplateEditLink ?? true) : false;
  const submitLabel = props.submitLabel ?? (props.mode === "temporary" ? "保存临时记录" : "保存");

  const splitsEnabled =
    props.mode === "template" &&
    !!props.templateCategoryId &&
    (props.templateType === "expense" || props.templateType === "income") &&
    !!props.categories &&
    props.categories.length > 0;

  // 跟踪金额给 SplitsField 算剩余。
  const [trackedAmount, setTrackedAmount] = useState<string>(amountDefault);
  const [noteOpen, setNoteOpen] = useState(!!noteDefault);
  const [splitsOpen, setSplitsOpen] = useState(false);
  const [trackedDate, setTrackedDate] = useState(occurredOnDefault);

  const [prevSuccess, setPrevSuccess] = useState(state.success);
  if (state.success !== prevSuccess) {
    setPrevSuccess(state.success);
    if (state.success) {
      setTrackedAmount("");
      setSplitsOpen(false);
    }
  }

  return (
    <>
      {state.success ? <InlineAlert>{state.success}</InlineAlert> : null}
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <form ref={formRef} action={formAction} className="grid gap-4">
        {/* Hero: 金额（移动优先，最长宽度 100%） */}
        <div className="grid gap-1 pt-1">
          <Label htmlFor="quick-amount" className="sr-only">
            金额
          </Label>
          <div className="flex items-baseline justify-center gap-1.5 px-1">
            <span className="shrink-0 text-base font-medium text-muted-foreground">{currency}</span>
            <MoneyInput
              id="quick-amount"
              ref={amountInputRef}
              name="amount"
              required
              placeholder="0"
              defaultValue={amountDefault}
              onChange={(event) => setTrackedAmount(event.target.value)}
              className={cn(
                "h-16 min-w-0 max-w-full flex-1 border-none bg-transparent p-0",
                "text-center text-[2.75rem] font-bold tabular-nums leading-none shadow-none",
                "focus-visible:ring-0 focus-visible:ring-offset-0",
              )}
            />
          </div>
        </div>

        {/* 元信息芯片：拆分 > 备注 > 日期（按使用频率从左到右） */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {splitsEnabled ? (
            <Chip
              active={splitsOpen}
              onClick={() => setSplitsOpen((v) => !v)}
              icon={<ScissorsIcon className="size-3.5" />}
            >
              拆分
            </Chip>
          ) : null}
          <Chip
            active={noteOpen || !!noteDefault}
            onClick={() => setNoteOpen((v) => !v)}
            icon={<StickyNoteIcon className="size-3.5" />}
          >
            备注
          </Chip>
          <DatePicker
            name="occurredOn"
            variant="chip"
            value={trackedDate}
            onChange={setTrackedDate}
            max={todayIsoDate()}
          />
        </div>

        {/* 备注（折叠） */}
        {noteOpen ? (
          <Textarea
            id="quick-note"
            name="note"
            rows={2}
            placeholder={
              props.mode === "template" ? (props.noteHint ?? "可选") : "可选，例如店名或用途"
            }
            defaultValue={noteDefault}
            autoFocus={!noteDefault}
            className="text-base"
          />
        ) : null}

        {/* 拆分（折叠） */}
        {splitsEnabled && splitsOpen && props.mode === "template" ? (
          <SplitsField
            totalAmountStr={trackedAmount}
            currency={currency}
            mainCategoryId={props.templateCategoryId ?? ""}
            mainCategoryLabel={props.templateCategoryLabel ?? null}
            categories={props.categories ?? []}
          />
        ) : null}

        {props.mode === "temporary" ? (
          <p className="rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
            保存为 JPY 支出 · 待补全
          </p>
        ) : null}

        <SubmitButton className="h-12 text-base">{submitLabel}</SubmitButton>

        {props.mode === "template" && showTemplateEditLink ? (
          <Link
            href={`/templates/${props.templateId}`}
            className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            编辑模板
          </Link>
        ) : null}
      </form>
    </>
  );
}

function Chip({
  active,
  onClick,
  icon,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-foreground/30 bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
