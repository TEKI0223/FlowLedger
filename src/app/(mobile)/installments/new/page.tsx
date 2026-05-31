import { notFound } from "next/navigation";
import { InstallmentForm } from "../installment-form";
import { createInstallmentPlan } from "@/app/actions/installments";
import { MoneyText } from "@/components/privacy/money-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinorForInput, transactionTypeLabels } from "@/domain/finance";
import { getTransaction } from "@/features/transactions/data";

export const dynamic = "force-dynamic";

type NewInstallmentPageProps = {
  searchParams: Promise<{
    originalTxId?: string;
  }>;
};

export default async function NewInstallmentPage({ searchParams }: NewInstallmentPageProps) {
  const { originalTxId } = await searchParams;

  if (!originalTxId) {
    notFound();
  }

  const originalTx = await getTransaction(originalTxId);

  if (!originalTx) {
    notFound();
  }

  const action = createInstallmentPlan.bind(null, originalTx.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新建分期计划</h1>
        <p className="text-sm text-muted-foreground tabular-nums">
          原始交易：{transactionTypeLabels[originalTx.type]} ·{" "}
          <MoneyText amountMinor={originalTx.amountMinor} currency={originalTx.currency} />{" "}
          · {originalTx.occurredOn}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>分期信息</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallmentForm
            action={action}
            defaults={{
              totalAmount: formatMinorForInput({
                amountMinor: originalTx.amountMinor,
                currency: originalTx.currency,
              }),
              currency: originalTx.currency,
              firstPaymentOn: originalTx.occurredOn,
            }}
            submitLabel="创建分期计划"
          />
        </CardContent>
      </Card>
    </main>
  );
}
