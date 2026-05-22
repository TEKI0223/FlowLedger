import Link from "next/link";
import { notFound } from "next/navigation";
import { TransactionForm } from "../transaction-form";
import { updateTransaction } from "@/app/actions/transactions";
import { getTransactionLookups } from "@/features/lookups/data";
import { getTransaction } from "@/features/transactions/data";
import { formatMinorForInput } from "@/domain/finance";

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
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/transactions">
            ← 交易
          </Link>
          <h1 className="brand-title">编辑交易</h1>
          <p className="brand-subtitle">保存时会自动回滚旧余额影响并应用新影响</p>
        </div>
      </header>

      <section className="task">
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
      </section>
    </main>
  );
}
