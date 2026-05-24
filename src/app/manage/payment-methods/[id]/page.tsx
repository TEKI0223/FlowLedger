import { notFound } from "next/navigation";
import { updatePaymentMethod } from "@/app/actions/payment-methods";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaymentMethod, listPaymentMethodAccountOptions } from "@/features/payment-methods/data";
import { DeletePaymentMethodButton } from "@/features/payment-methods/delete-payment-method-button";
import { PaymentMethodForm } from "@/features/payment-methods/payment-method-form";

export const dynamic = "force-dynamic";

type PaymentMethodPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PaymentMethodPage({ params, searchParams }: PaymentMethodPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [paymentMethod, accounts] = await Promise.all([
    getPaymentMethod(id),
    listPaymentMethodAccountOptions(),
  ]);

  if (!paymentMethod) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{paymentMethod.name}</h1>
          <DeletePaymentMethodButton id={paymentMethod.id} name={paymentMethod.name} />
        </div>
        <p className="text-sm text-muted-foreground">
          {paymentMethod.enabled ? "已启用" : "已停用"}
          {paymentMethod.defaultAccount ? ` · 默认账户：${paymentMethod.defaultAccount.name}` : ""}
        </p>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>支付方式内容</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodForm
            action={updatePaymentMethod.bind(null, paymentMethod.id)}
            accounts={accounts}
            defaults={{
              name: paymentMethod.name,
              type: paymentMethod.type,
              currency: paymentMethod.currency,
              defaultAccountId: paymentMethod.defaultAccountId,
              enabled: paymentMethod.enabled,
              note: paymentMethod.note,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-2 rounded-lg border border-border px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">交易引用</span>
          <span className="font-medium tabular-nums">{paymentMethod.transactionCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">快捷模板引用</span>
          <span className="font-medium tabular-nums">{paymentMethod.templateCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">周期项目引用</span>
          <span className="font-medium tabular-nums">{paymentMethod.recurringCount}</span>
        </div>
      </section>
    </main>
  );
}
