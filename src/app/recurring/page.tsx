import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listRecurringItems } from "@/features/recurring/data";
import { RecurringCard } from "@/features/recurring/recurring-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const items = await listRecurringItems();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">周期项目</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{items.length} 个项目</span>
            <Link
              href="/recurring/new"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1")}
            >
              <PlusIcon className="size-3.5" />
              新建
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有周期项目。先新建一个周期项目。
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <RecurringCard item={item} key={item.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
