import { notFound } from "next/navigation";
import { TransactionForm } from "@/features/transactions/transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/domain/finance";
import { getAccount } from "@/features/accounts/data";
import { getTransactionLookups } from "@/features/lookups/data";
import { todayIsoDate } from "@/lib/dates";
import { formatAccountName } from "@/features/accounts/labels";

export const dynamic = "force-dynamic";

type CalibratePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountCalibratePage({ params }: CalibratePageProps) {
  const { id } = await params;
  const [account, lookups] = await Promise.all([getAccount(id), getTransactionLookups()]);

  if (!account) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          余额校准：{formatAccountName(account)}
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          当前系统余额：
          {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>校准记录</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm
            action={createTransaction}
            lookups={lookups}
            defaults={{
              occurredOn: todayIsoDate(),
              type: "adjustment",
              currency: account.currency,
              targetAccountId: account.id,
              note: `${account.name} 余额校准`,
            }}
            submitLabel="保存校准"
          />
        </CardContent>
      </Card>
    </main>
  );
}
