import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, LayersIcon, ReceiptIcon } from "lucide-react";
import { TransactionForm } from "../transaction-form";
import { updateTransaction } from "@/app/actions/transactions";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            mode="edit"
          />
        </CardContent>
      </Card>

      {transaction.type === "expense" ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">关联管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link
              href={`/refunds/new?originalTxId=${transaction.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-auto min-h-14 w-full justify-start gap-3 text-left",
              )}
            >
              <ReceiptIcon className="size-4 text-muted-foreground shrink-0" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold">新建退款追踪</span>
                <span className="text-xs text-muted-foreground">
                  商家退、订单取消、信用卡返还等
                </span>
              </span>
            </Link>
            <Link
              href={`/installments/new?originalTxId=${transaction.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-auto min-h-14 w-full justify-start gap-3 text-left",
              )}
            >
              <LayersIcon className="size-4 text-muted-foreground shrink-0" />
              <span className="flex flex-col items-start gap-0.5">
                <span className="text-sm font-semibold">新建分期计划</span>
                <span className="text-xs text-muted-foreground">
                  把这笔消费拆成多期记录每期扣款进度
                </span>
              </span>
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
