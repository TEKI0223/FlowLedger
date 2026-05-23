import Link from "next/link";
import { notFound } from "next/navigation";
import { LayersIcon, ReceiptIcon } from "lucide-react";
import { DeleteTransactionButton } from "../delete-transaction-button";
import { TransactionForm } from "../transaction-form";
import { updateTransaction } from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormActionBar } from "@/components/ui/form-action-bar";
import { formatMinorForInput } from "@/domain/finance";
import { getTransactionLookups } from "@/features/lookups/data";
import { getTransaction } from "@/features/transactions/data";
import { cn } from "@/lib/utils";

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
      {transaction.type === "expense" ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Link
            href={`/refunds/new?originalTxId=${transaction.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            <ReceiptIcon className="size-4 text-muted-foreground" />
            退款
          </Link>
          <Link
            href={`/installments/new?originalTxId=${transaction.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11")}
          >
            <LayersIcon className="size-4 text-muted-foreground" />
            分期
          </Link>
        </div>
      ) : null}

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
            mode="edit"
            id="transaction-edit-form"
            hideSubmit
          />
        </CardContent>
      </Card>

      <div className="mt-4">
        <FormActionBar
          formId="transaction-edit-form"
          submitLabel="保存修改"
          cancelHref="/transactions"
          dangerAction={
            <DeleteTransactionButton
              id={transaction.id}
              className="h-11 border border-destructive/25 bg-destructive/10 px-3"
            />
          }
        />
      </div>
    </main>
  );
}
