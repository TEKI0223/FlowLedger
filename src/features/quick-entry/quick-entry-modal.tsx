"use client";

import { useEffect, useState } from "react";
import { ActionTile } from "@/components/ui/action-tile";
import { QuickEntryForm } from "./quick-entry-form";

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

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

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

            {selectedTemplate.id === "temp" ? (
              <QuickEntryForm
                key={selectedTemplate.id}
                mode="temporary"
                autoFocusAmount
                submitLabel="保存"
              />
            ) : (
              <QuickEntryForm
                key={selectedTemplate.id}
                mode="template"
                templateId={selectedTemplate.id}
                currency={selectedTemplate.currency}
                autoFocusAmount
              />
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
