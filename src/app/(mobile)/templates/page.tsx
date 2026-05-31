import Link from "next/link";
import { PlusIcon, ZapIcon } from "lucide-react";
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
    <main className="mx-auto w-full max-w-xl px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-6 md:pt-6">
      <section className="min-w-0">
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
            <ZapIcon className="size-4 text-muted-foreground" />
            快捷模板
          </h2>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-muted-foreground">
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
          <div className="grid min-w-0 gap-3">
            {templates.map((template) => (
              <TemplateCard template={template} key={template.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
