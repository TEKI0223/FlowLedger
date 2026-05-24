import { createCreditCard } from "@/app/actions/credit-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCreditCardAccountOptions } from "@/features/credit-cards/data";
import { CreditCardForm } from "@/features/credit-cards/credit-card-form";

export const dynamic = "force-dynamic";

export default async function NewCreditCardPage() {
  const repaymentAccounts = await listCreditCardAccountOptions();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增信用卡</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>信用卡内容</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditCardForm
            action={createCreditCard}
            repaymentAccounts={repaymentAccounts}
            submitLabel="保存信用卡"
          />
        </CardContent>
      </Card>
    </main>
  );
}
