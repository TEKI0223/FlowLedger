import { createPaymentMethod } from "@/app/actions/payment-methods";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPaymentMethodAccountOptions } from "@/features/payment-methods/data";
import { PaymentMethodForm } from "@/features/payment-methods/payment-method-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentMethodPage() {
  const accounts = await listPaymentMethodAccountOptions();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增支付方式</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>支付方式内容</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodForm
            action={createPaymentMethod}
            accounts={accounts}
            defaults={{ enabled: true, currency: "JPY", type: "other" }}
            submitLabel="保存支付方式"
          />
        </CardContent>
      </Card>
    </main>
  );
}
