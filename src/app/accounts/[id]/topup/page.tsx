import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { TransactionForm } from "@/app/transactions/transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountTypeLabels, formatMoney } from "@/domain/finance";
import { getAccount } from "@/features/accounts/data";
import { getTransactionLookups } from "@/features/lookups/data";
import { todayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type TopupPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountTopupPage({ params }: TopupPageProps) {
  const { id } = await params;
  const [account, lookups] = await Promise.all([getAccount(id), getTransactionLookups()]);

  if (!account) {
    notFound();
  }

  const title = account.type === "credit_card" ? "记一笔还款" : "充值 / 转入";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href={`/accounts/${account.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {account.name}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          {accountTypeLabels[account.type]} · 当前余额：
          {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>转入 {account.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={createTransaction}
            lookups={lookups}
            defaults={{
              occurredOn: todayIsoDate(),
              type: "transfer",
              currency: account.currency,
              targetAccountId: account.id,
              note: `${account.name} 转入`,
            }}
            submitLabel="保存"
          />
        </CardContent>
      </Card>
    </main>
  );
}
