"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  createQuickEntryTransaction,
  createTemporaryTransaction,
} from "@/app/actions/transactions";
import { ActionTile } from "@/components/ui/action-tile";
import { SubmitButton } from "@/components/ui/submit-button";
import { todayIsoDate } from "@/lib/dates";

type QuickEntryTileTheme =
  | "bank"
  | "card"
  | "wallet"
  | "cash"
  | "income"
  | "transfer"
  | "temporary";

export type QuickEntryModalTemplate = {
  id: string;
  title: string;
  meta: string;
  context: string;
  amountHint: string;
  badge: string;
  theme: QuickEntryTileTheme;
  typeLabel: string;
  type: "income" | "expense" | "transfer" | "adjustment" | "temporary";
  currency: "JPY" | "CNY";
};

type QuickEntryModalProps = {
  templates: QuickEntryModalTemplate[];
};

export function QuickEntryModal({ templates }: QuickEntryModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<QuickEntryModalTemplate | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    amountInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedTemplate(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTemplate]);

  const saveAction =
    selectedTemplate?.id === "temp" || !selectedTemplate
      ? createTemporaryTransaction
      : createQuickEntryTransaction.bind(null, selectedTemplate.id);

  return (
    <>
      <div className="action-grid">
        {templates.map((template) => (
          <ActionTile
            title={template.title}
            meta={template.meta}
            amountHint={template.amountHint}
            badge={template.badge}
            theme={template.theme}
            onClick={() => setSelectedTemplate(template)}
            key={template.id}
          />
        ))}
      </div>

      {selectedTemplate ? (
        <div className="modal-backdrop" onMouseDown={() => setSelectedTemplate(null)}>
          <section
            className="quick-entry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-entry-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-topbar">
              <div>
                <span className={`quick-entry-type ${selectedTemplate.type}`}>
                  {selectedTemplate.typeLabel}
                </span>
                <h2 id="quick-entry-modal-title">{selectedTemplate.title}</h2>
                <p>{selectedTemplate.context}</p>
              </div>
              <button
                className="modal-close"
                type="button"
                aria-label="关闭"
                onClick={() => setSelectedTemplate(null)}
              >
                X
              </button>
            </div>

            <form action={saveAction} className="quick-entry-form">
              <label className="amount-field">
                <span>金额</span>
                <input
                  ref={amountInputRef}
                  name="amount"
                  inputMode="decimal"
                  required
                  placeholder={selectedTemplate.currency === "JPY" ? "1200" : "38.50"}
                />
              </label>

              <div className="compact-form-grid">
                <label>
                  <span>日期</span>
                  <input name="occurredOn" type="date" required defaultValue={todayIsoDate()} />
                </label>
                <label>
                  <span>币种</span>
                  <input value={selectedTemplate.currency} readOnly aria-label="币种" />
                </label>
              </div>

              <label>
                <span>备注</span>
                <textarea name="note" rows={3} placeholder="可选" />
              </label>

              <div className="quick-entry-actions">
                <SubmitButton>保存</SubmitButton>
                <Link className="secondary-action" href="/transactions">
                  完整录入
                </Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
