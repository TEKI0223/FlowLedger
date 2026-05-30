import { Card } from "@/components/ui/card";
import { type InstallmentStatus } from "@/domain/installment";
import { InstallmentCard } from "@/features/installments/installment-card";
import { listInstallmentPlans } from "@/features/installments/data";

export const dynamic = "force-dynamic";

const statusOrder: Record<InstallmentStatus, number> = {
  active: 0,
  completed: 1,
  cancelled: 2,
};

export default async function InstallmentsPage() {
  const plans = await listInstallmentPlans();

  plans.sort((a, b) => {
    const orderA = statusOrder[a.status as InstallmentStatus];
    const orderB = statusOrder[b.status as InstallmentStatus];
    if (orderA !== orderB) return orderA - orderB;
    return a.firstPaymentOn < b.firstPaymentOn ? 1 : -1;
  });

  const activeCount = plans.filter((p) => p.status === "active").length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">分期计划</h2>
          <span className="text-xs text-muted-foreground">
            {plans.length} 个计划 · {activeCount} 个进行中
          </span>
        </div>

        {plans.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有分期计划。
          </Card>
        ) : (
          <div className="grid gap-3">
            {plans.map((plan) => (
              <InstallmentCard plan={plan} key={plan.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
