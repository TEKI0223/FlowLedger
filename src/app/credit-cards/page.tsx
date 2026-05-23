import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, CreditCardIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/domain/finance";
import { listCardStatements, listCreditCards } from "@/features/credit-cards/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CreditCardsPage() {
  const cards = await listCreditCards();
  const statementsByCardId = new Map<string, Awaited<ReturnType<typeof listCardStatements>>>();

  await Promise.all(
    cards.map(async (card) => {
      const statements = await listCardStatements(card, 2);
      statementsByCardId.set(card.id, statements);
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          首页
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">信用卡</h1>
        <p className="text-sm text-muted-foreground">
          按账单周期归属消费，扣款日提醒，还款转账核对
        </p>
      </header>

      {cards.length === 0 ? (
        <Card size="sm" className="px-4 py-8 text-center text-sm text-muted-foreground">
          还没有启用的信用卡。可以在账户中创建 credit_card 类型，并在 credit_cards 表配置账单日。
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => {
            const statements = statementsByCardId.get(card.id) ?? [];
            const currentStatement = statements.find((s) => s.isCurrent);
            const previousStatement = statements.find((s) => !s.isCurrent);

            return (
              <Link
                key={card.id}
                href={`/credit-cards/${card.id}`}
                className="block transition-colors"
              >
                <Card className="h-full transition-colors hover:bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <CreditCardIcon className="size-4 text-muted-foreground" />
                        {card.account.name}
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground" />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      账单日 {card.closingDay} 号 · 扣款日 {card.paymentDay} 号 ·{" "}
                      {card.cycleBoundary === "inclusive" ? "含当天" : "不含当天"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentStatement ? (
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          本期消费
                        </p>
                        <p className="text-2xl font-semibold tabular-nums">
                          {formatMoney({
                            amountMinor: currentStatement.totalAmountMinor,
                            currency: card.account.currency,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          截止 {currentStatement.periodEnd} · 扣款 {currentStatement.dueDate}
                        </p>
                      </div>
                    ) : null}

                    {previousStatement ? (
                      <div
                        className={cn(
                          "rounded-md border px-3 py-2 text-xs",
                          previousStatement.isOverdue
                            ? "border-expense/40 bg-expense/5 text-expense"
                            : previousStatement.isPaid
                              ? "border-income/30 bg-income/5 text-income"
                              : "border-border bg-muted/40 text-muted-foreground",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>上期 {previousStatement.periodEnd}</span>
                          <span className="font-semibold tabular-nums">
                            {formatMoney({
                              amountMinor: previousStatement.totalAmountMinor,
                              currency: card.account.currency,
                            })}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span>扣款 {previousStatement.dueDate}</span>
                          {previousStatement.isPaid ? (
                            <Badge variant="outline" className="text-xs text-income border-income/30">
                              已还款
                            </Badge>
                          ) : previousStatement.isOverdue ? (
                            <Badge variant="outline" className="text-xs text-expense border-expense/30">
                              逾期未还
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              待还款
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
