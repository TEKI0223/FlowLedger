import { Card } from "@/components/ui/card";
import { type RefundStatus } from "@/domain/refund";
import { listRefundTrackers } from "@/features/refunds/data";
import { RefundCard } from "@/features/refunds/refund-card";

export const dynamic = "force-dynamic";

const statusOrder: Record<RefundStatus, number> = {
  pending: 0,
  partial: 1,
  received: 2,
  cancelled: 3,
};

export default async function RefundsPage() {
  const trackers = await listRefundTrackers();

  trackers.sort((a, b) => {
    const orderA = statusOrder[a.status as RefundStatus];
    const orderB = statusOrder[b.status as RefundStatus];
    if (orderA !== orderB) return orderA - orderB;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const pendingCount = trackers.filter(
    (t) => t.status === "pending" || t.status === "partial",
  ).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">退款追踪</h2>
          <span className="text-xs text-muted-foreground">
            {trackers.length} 笔 · {pendingCount} 笔未完成
          </span>
        </div>

        {trackers.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有退款追踪。
          </Card>
        ) : (
          <div className="grid gap-3">
            {trackers.map((tracker) => (
              <RefundCard tracker={tracker} key={tracker.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
