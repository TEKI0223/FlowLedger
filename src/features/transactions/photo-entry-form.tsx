"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { CameraIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { extractReceiptFromImage } from "@/app/actions/ocr";
import { createEntryTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import type { Currency, TransactionType } from "@/domain/finance";
import type { CategoryPickerOption } from "@/features/categories/category-picker";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { compressImageForOcr } from "@/lib/image";
import { todayIsoDate } from "@/lib/dates";
import type { ReceiptData } from "@/lib/ocr";

type Lookups = {
  accounts: Array<{
    id: string;
    name: string;
    lastDigits: string | null;
    currency: Currency;
    balanceMinor: number;
  }>;
  categories: CategoryPickerOption[];
  paymentMethods: Array<{ id: string; name: string; defaultAccountId: string | null }>;
};

type Defaults = {
  occurredOn: string;
  type: TransactionType;
  amount?: string;
  currency: Currency;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
};

type Status = "idle" | "compressing" | "extracting" | "ready" | "error";

const INITIAL_DEFAULTS: Defaults = {
  occurredOn: todayIsoDate(),
  type: "expense",
  currency: "JPY",
};

export function PhotoEntryForm({ lookups }: { lookups: Lookups }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<Defaults>(INITIAL_DEFAULTS);
  const [formKey, setFormKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setErrorMsg(null);
    setWarning(null);
    setProviderLabel(null);
    setStatus("compressing");

    let compressed;
    try {
      compressed = await compressImageForOcr(file);
    } catch (error) {
      setStatus("error");
      setErrorMsg(error instanceof Error ? error.message : "图片压缩失败");
      return;
    }

    setStatus("extracting");
    const result = await extractReceiptFromImage(compressed.base64, compressed.mimeType);

    if (!result.ok) {
      setStatus("error");
      setErrorMsg(result.error);
      return;
    }

    setDefaults((current) => mergeReceiptIntoDefaults(current, result.data));
    setFormKey((k) => k + 1);
    setProviderLabel(result.providerId);
    setWarning(result.warning);
    setStatus("ready");
  }

  function triggerPicker() {
    inputRef.current?.click();
  }

  const isBusy = status === "compressing" || status === "extracting";

  return (
    <div className="grid gap-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      <div className="grid gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">拍照识别</p>
            <p className="text-xs text-muted-foreground">拍一张小票，自动预填金额、日期和分类</p>
          </div>
          <Button
            type="button"
            onClick={triggerPicker}
            disabled={isBusy}
            className="shrink-0 gap-2"
          >
            {isBusy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : status === "ready" ? (
              <RefreshCwIcon className="size-4" />
            ) : (
              <CameraIcon className="size-4" />
            )}
            {status === "compressing"
              ? "压缩中"
              : status === "extracting"
                ? "识别中"
                : status === "ready"
                  ? "重新拍照"
                  : "拍照"}
          </Button>
        </div>

        {status === "ready" && providerLabel ? (
          <p className="text-xs text-muted-foreground">
            已通过 <span className="font-medium">{providerLabel}</span> 识别，请核对下方表单。
          </p>
        ) : null}
        {warning ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            {warning}
          </p>
        ) : null}
      </div>

      {errorMsg ? <InlineAlert tone="danger">{errorMsg}</InlineAlert> : null}

      <TransactionForm
        key={formKey}
        action={createEntryTransaction}
        lookups={lookups}
        defaults={defaults}
        submitLabel="保存交易"
      />
    </div>
  );
}

function mergeReceiptIntoDefaults(current: Defaults, data: ReceiptData): Defaults {
  return {
    ...current,
    occurredOn: data.occurredOn ?? current.occurredOn,
    amount: data.amount ?? current.amount,
    currency: data.currency ?? current.currency,
    categoryId: data.categoryId ?? current.categoryId,
    note: data.note ?? current.note,
  };
}
