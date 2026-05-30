import { notFound } from "next/navigation";
import { updateCreditCard } from "@/app/actions/credit-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCreditCard, listCreditCardAccountOptions } from "@/features/credit-cards/data";
import { CreditCardForm } from "@/features/credit-cards/credit-card-form";

export const dynamic = "force-dynamic";

type EditCreditCardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCreditCardPage({ params }: EditCreditCardPageProps) {
  const { id } = await params;
  const [card, repaymentAccounts] = await Promise.all([
    getCreditCard(id),
    listCreditCardAccountOptions(),
  ]);

  if (!card) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">编辑信用卡</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{card.account.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditCardForm
            action={updateCreditCard.bind(null, card.id)}
            repaymentAccounts={repaymentAccounts}
            defaults={{
              name: card.account.name,
              lastDigits: card.account.lastDigits,
              currency: card.account.currency,
              balanceMinor: card.account.balanceMinor,
              closingDay: card.closingDay,
              paymentDay: card.paymentDay,
              paymentMonthOffset: card.paymentMonthOffset as 0 | 1 | 2,
              cycleBoundary: card.cycleBoundary,
              repaymentAccountId: card.repaymentAccountId,
              enabled: card.enabled,
              note: card.account.note,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>
    </main>
  );
}
