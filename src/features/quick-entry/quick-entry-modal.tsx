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
import type { CategoryPickerOption } from "@/features/categories/category-picker";
import { QuickEntryForm } from "./quick-entry-form";

export type QuickEntryModalTemplate = {
  id: string;
  title: string;
  meta: string;
  context: string;
  amountHint: string;
  amountMinor?: number | null;
  amountDefault?: string;
  usageCount?: number;
  theme: ActionTileTheme;
  categoryIconKey?: string | null;
  typeLabel: string;
  type: "income" | "expense" | "transfer" | "adjustment" | "temporary";
  currency: "JPY" | "CNY";
  /** 模板主分类 id（用于拆分校验、剩余金额归属）。null 表示模板未设分类。 */
  categoryId?: string | null;
  /** 主分类 label（"食材"/"外食/咖啡"），用于剩余金额提示。 */
  categoryLabel?: string | null;
};

type QuickEntryModalProps = {
  templates: QuickEntryModalTemplate[];
  /** 所有可用分类，用于拆分时的 CategoryPicker。 */
  categories?: CategoryPickerOption[];
};

export function QuickEntryModal({ templates, categories = [] }: QuickEntryModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<QuickEntryModalTemplate | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {templates.map((template) => (
          <ActionTile
            title={template.title}
            meta={template.meta}
            amountHint={template.amountHint}
            amountMinor={template.amountMinor}
            currency={template.currency}
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
                  templateType={selectedTemplate.type}
                  templateCategoryId={selectedTemplate.categoryId ?? null}
                  templateCategoryLabel={selectedTemplate.categoryLabel ?? null}
                  categories={categories}
                />
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
