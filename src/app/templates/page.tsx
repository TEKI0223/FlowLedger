import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listAllQuickEntryTemplates } from "@/features/quick-entry/data";
import { TemplateCard } from "@/features/quick-entry/template-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listAllQuickEntryTemplates();
  const enabledCount = templates.filter((t) => t.enabled).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">快捷模板</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {templates.length} 个模板 · {enabledCount} 个启用
            </span>
            <Link
              href="/templates/new"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1")}
            >
              <PlusIcon className="size-3.5" />
              新建
            </Link>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有模板。先新建一个模板。
          </Card>
        ) : (
          <div className="grid gap-3">
            {templates.map((template) => (
              <TemplateCard template={template} key={template.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
