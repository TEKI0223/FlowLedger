import { notFound } from "next/navigation";
import { RefundTrackerForm } from "../refund-tracker-form";
import { createRefundTracker } from "@/app/actions/refunds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorForInput, formatMoney, transactionTypeLabels } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { getTransaction } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

type NewRefundPageProps = {
  searchParams: Promise<{
    originalTxId?: string;
  }>;
};

export default async function NewRefundPage({ searchParams }: NewRefundPageProps) {
  const { originalTxId } = await searchParams;

  if (!originalTxId) {
    notFound();
  }

  const [originalTx, lookups] = await Promise.all([
    getTransaction(originalTxId),
    getTransactionLookups(),
  ]);

  if (!originalTx) {
    notFound();
  }

  const action = createRefundTracker.bind(null, originalTx.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新建退款追踪</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          原始交易：{transactionTypeLabels[originalTx.type]} ·{" "}
          {formatMoney({
            amountMinor: originalTx.amountMinor,
            currency: originalTx.currency,
          })}{" "}
          · {originalTx.occurredOn}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>退款信息</CardTitle>
        </CardHeader>
        <CardContent>
          <RefundTrackerForm
            action={action}
            lookups={lookups}
            defaults={{
              amount: formatMinorForInput({
                amountMinor: originalTx.amountMinor,
                currency: originalTx.currency,
              }),
              currency: originalTx.currency,
              expectedAccountId: originalTx.sourceAccountId ?? undefined,
              note: originalTx.note ?? undefined,
            }}
            submitLabel="创建退款追踪"
          />
        </CardContent>
      </Card>
    </main>
  );
}
