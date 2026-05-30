import { notFound } from "next/navigation";
import { ZapIcon } from "lucide-react";
import { TemplateForm } from "../template-form";
import { DeleteTemplateButton } from "../delete-template-button";
import { updateQuickEntryTemplate } from "@/app/actions/quick-entry-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorForInput } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { getQuickEntryTemplateAnyStatus } from "@/features/quick-entry/data";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;
  const [template, lookups] = await Promise.all([
    getQuickEntryTemplateAnyStatus(id),
    getTransactionLookups(),
  ]);

  if (!template) {
    notFound();
  }

  const amountDefault =
    template.amountMinor === null || template.amountMinor === undefined
      ? ""
      : formatMinorForInput({
          amountMinor: template.amountMinor,
          currency: template.currency,
        });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <ZapIcon className="size-6 text-muted-foreground" />
            {template.name}
          </h1>
          <DeleteTemplateButton id={template.id} name={template.name} />
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          使用过 {template.usageCount} 次
          {template.lastUsedAt ? ` · 最近 ${template.lastUsedAt.slice(0, 10)}` : ""}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>模板内容</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            action={updateQuickEntryTemplate.bind(null, template.id)}
            lookups={lookups}
            defaults={{
              name: template.name,
              type: template.type,
              currency: template.currency,
              amount: amountDefault,
              categoryId: template.categoryId ?? undefined,
              sourceAccountId: template.sourceAccountId ?? undefined,
              targetAccountId: template.targetAccountId ?? undefined,
              paymentMethodId: template.paymentMethodId ?? undefined,
              note: template.note ?? undefined,
              enabled: template.enabled,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
