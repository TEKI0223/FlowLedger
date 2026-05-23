import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
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
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          快捷模板
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新建模板</h1>
        <p className="text-sm text-muted-foreground">
          模板会出现在首页的快捷记账网格，点击后只要填金额（或留空让用户输入）就能保存
        </p>
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
