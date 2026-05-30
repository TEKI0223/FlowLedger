import { RecurringForm } from "../recurring-form";
import { createRecurringItem } from "@/app/actions/recurring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTransactionLookups } from "@/features/lookups/data";

export const dynamic = "force-dynamic";

export default async function NewRecurringPage() {
  const lookups = await getTransactionLookups();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增周期项</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>周期项内容</CardTitle>
        </CardHeader>
        <CardContent>
          <RecurringForm action={createRecurringItem} lookups={lookups} submitLabel="创建" />
        </CardContent>
      </Card>
    </main>
  );
}
