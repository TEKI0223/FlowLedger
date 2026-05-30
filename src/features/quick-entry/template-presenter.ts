import type { ActionTileTheme } from "@/components/ui/action-tile";
import { formatMinorForInput, formatMoney, transactionTypeLabels } from "@/domain/finance";
import type { HydratedQuickEntryTemplate } from "./data";
import type { QuickEntryModalTemplate } from "./quick-entry-modal";

export function toQuickEntryModalTemplate(
  template: HydratedQuickEntryTemplate,
): QuickEntryModalTemplate {
  return {
    id: template.id,
    title: template.name,
    meta: templateMeta(template),
    context: templateContext(template),
    amountHint: amountHint(template),
    amountDefault: amountDefault(template),
    usageCount: template.usageCount,
    theme: templateTheme(template),
    categoryIconKey: template.category?.resolvedIconKey,
    typeLabel: transactionTypeLabels[template.type],
    type: template.type,
    currency: template.currency,
    categoryId: template.categoryId ?? null,
    categoryLabel: template.category?.label ?? null,
  };
}

export function temporaryQuickEntryTemplate(): QuickEntryModalTemplate {
  return {
    id: "temp",
    title: "临时记录",
    meta: "其他 / 日元现金",
    context: "默认 JPY 支出，保存后可以去交易页补充分类、账户和支付方式",
    amountHint: "待补全",
    theme: "temporary",
    categoryIconKey: "other",
    typeLabel: "待补全",
    type: "temporary",
    currency: "JPY",
  };
}

function templateMeta(template: HydratedQuickEntryTemplate) {
  return template.category?.label ?? transactionTypeLabels[template.type];
}

function templateContext(template: HydratedQuickEntryTemplate) {
  const context = [
    template.category?.name,
    template.paymentMethod?.name,
    template.sourceAccount?.name,
    template.targetAccount?.name,
  ].filter(Boolean);

  return context.length > 0 ? context.join(" / ") : transactionTypeLabels[template.type];
}

function amountHint(template: HydratedQuickEntryTemplate) {
  if (template.amountMinor === null) {
    return "自填";
  }

  return formatMoney({
    amountMinor: template.amountMinor,
    currency: template.currency,
  });
}

function amountDefault(template: HydratedQuickEntryTemplate) {
  if (template.amountMinor === null) {
    return undefined;
  }

  return formatMinorForInput({
    amountMinor: template.amountMinor,
    currency: template.currency,
  });
}

function templateTheme(template: HydratedQuickEntryTemplate): ActionTileTheme {
  if (template.type === "income") {
    return "income";
  }

  if (template.type === "transfer") {
    return "transfer";
  }

  const id = template.paymentMethodId ?? template.sourceAccountId ?? template.targetAccountId ?? "";

  if (id.includes("credit") || id.includes("apple")) {
    return "card";
  }

  if (id.includes("cash")) {
    return "cash";
  }

  if (id.includes("bank")) {
    return "bank";
  }

  return "wallet";
}
