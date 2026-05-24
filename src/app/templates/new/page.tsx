import { TemplateForm } from "../template-form";
import { createQuickEntryTemplate } from "@/app/actions/quick-entry-templates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionLookups } from "@/features/lookups/data";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  const lookups = await getTransactionLookups();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新建模板</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>模板内容</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            action={createQuickEntryTemplate}
            lookups={lookups}
            submitLabel="创建模板"
          />
        </CardContent>
      </Card>
    </main>
  );
}
