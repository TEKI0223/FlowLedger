import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TransactionForm } from "../transaction-form";
import { updateTransaction } from "@/app/actions/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorForInput } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { getTransaction } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

type TransactionEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TransactionEditPage({ params }: TransactionEditPageProps) {
  const { id } = await params;
  const [transaction, lookups] = await Promise.all([getTransaction(id), getTransactionLookups()]);

  if (!transaction) {
    notFound();
  }

  const action = updateTransaction.bind(null, transaction.id);
  const amountValue = formatMinorForInput({
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          交易
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">编辑交易</h1>
        <p className="text-sm text-muted-foreground">保存时会自动回滚旧余额影响并应用新影响</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>交易内容</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={action}
            lookups={lookups}
            defaults={{
              occurredOn: transaction.occurredOn,
              type: transaction.type,
              amount: amountValue,
              currency: transaction.currency,
              categoryId: transaction.categoryId ?? undefined,
              sourceAccountId: transaction.sourceAccountId ?? undefined,
              targetAccountId: transaction.targetAccountId ?? undefined,
              paymentMethodId: transaction.paymentMethodId ?? undefined,
              note: transaction.note ?? undefined,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
