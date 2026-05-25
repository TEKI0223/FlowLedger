"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionTile, type ActionTileTheme } from "@/components/ui/action-tile";
import { QuickEntryForm } from "./quick-entry-form";

export type QuickEntryModalTemplate = {
  id: string;
  title: string;
  meta: string;
  context: string;
  amountHint: string;
  amountDefault?: string;
  usageCount?: number;
  theme: ActionTileTheme;
  categoryIconKey?: string | null;
  typeLabel: string;
  type: "income" | "expense" | "transfer" | "adjustment" | "temporary";
  currency: "JPY" | "CNY";
};

type QuickEntryModalProps = {
  templates: QuickEntryModalTemplate[];
};

export function QuickEntryModal({ templates }: QuickEntryModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<QuickEntryModalTemplate | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {templates.map((template) => (
          <ActionTile
            title={template.title}
            meta={template.meta}
            amountHint={template.amountHint}
            usageCount={template.usageCount}
            theme={template.theme}
            categoryIconKey={template.categoryIconKey}
            type={template.type === "temporary" ? undefined : template.type}
            onClick={() => setSelectedTemplate(template)}
            key={template.id}
          />
        ))}
      </div>

      <Dialog
        open={!!selectedTemplate}
        onOpenChange={(open) => {
          if (!open) setSelectedTemplate(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-auto">
          {selectedTemplate ? (
            <>
              <DialogHeader>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {selectedTemplate.typeLabel}
                </p>
                <DialogTitle className="text-xl">{selectedTemplate.title}</DialogTitle>
                <DialogDescription>{selectedTemplate.context}</DialogDescription>
              </DialogHeader>

              {selectedTemplate.id === "temp" ? (
                <QuickEntryForm key={selectedTemplate.id} mode="temporary" autoFocusAmount />
              ) : (
                <QuickEntryForm
                  key={selectedTemplate.id}
                  mode="template"
                  templateId={selectedTemplate.id}
                  currency={selectedTemplate.currency}
                  amountDefault={selectedTemplate.amountDefault}
                  autoFocusAmount
                />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
