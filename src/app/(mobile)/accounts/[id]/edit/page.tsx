import { notFound } from "next/navigation";
import { EditAccountForm } from "./edit-account-form";
import { MoneyText } from "@/components/privacy/money-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccount } from "@/features/accounts/data";
import { formatAccountName } from "@/features/accounts/labels";

export const dynamic = "force-dynamic";

type AccountEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountEditPage({ params }: AccountEditPageProps) {
  const { id } = await params;
  const account = await getAccount(id);

  if (!account) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          编辑账户：{formatAccountName(account)}
        </h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          当前余额：
          <MoneyText amountMinor={account.balanceMinor} currency={account.currency} />
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
        </CardHeader>
        <CardContent>
          <EditAccountForm account={account} />
        </CardContent>
      </Card>
    </main>
  );
}
