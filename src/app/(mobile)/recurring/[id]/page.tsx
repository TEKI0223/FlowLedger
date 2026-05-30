import { notFound } from "next/navigation";
import { DeleteRecurringButton } from "../delete-recurring-button";
import { RecurringForm } from "../recurring-form";
import { updateRecurringItem } from "@/app/actions/recurring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEffectiveRecurringDate } from "@/domain/date-shift";
import { formatMinorForInput } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { getRecurringItem } from "@/features/recurring/data";

export const dynamic = "force-dynamic";

type RecurringEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecurringEditPage({ params }: RecurringEditPageProps) {
  const { id } = await params;
  const [item, lookups] = await Promise.all([getRecurringItem(id), getTransactionLookups()]);

  if (!item) {
    notFound();
  }

  const action = updateRecurringItem.bind(null, item.id);
  const amountDefault =
    item.amountMinor === null
      ? ""
      : formatMinorForInput({ amountMinor: item.amountMinor, currency: item.currency });
  const effectiveDate = getEffectiveRecurringDate(item);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">编辑周期项</h1>

          <DeleteRecurringButton id={item.id} name={item.name} />
        </div>
        <p className="text-sm text-muted-foreground">
          下次发生日期：{effectiveDate}
          {effectiveDate !== item.nextDate ? `（原 ${item.nextDate}，已按非营业日调整）` : null}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{item.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecurringForm
            action={action}
            lookups={lookups}
            defaults={{
              name: item.name,
              type: item.type,
              amount: amountDefault,
              amountFixed: item.amountFixed,
              currency: item.currency,
              frequency: item.frequency,
              nextDate: item.nextDate,
              categoryId: item.categoryId ?? undefined,
              sourceAccountId: item.sourceAccountId ?? undefined,
              targetAccountId: item.targetAccountId ?? undefined,
              paymentMethodId: item.paymentMethodId ?? undefined,
              note: item.note ?? undefined,
              enabled: item.enabled,
              dateShiftPolicy: item.dateShiftPolicy,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
