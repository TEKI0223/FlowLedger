import Link from "next/link";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { NewAccountForm } from "./new-account-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accountTypeLabels, currencyLabels, formatMoney } from "@/domain/finance";
import { listAccounts } from "@/features/accounts/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await listAccounts();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            首页
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">账户</h1>
          <p className="text-sm text-muted-foreground">管理现金、银行、信用卡和余额账户</p>
        </div>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-11 gap-2")}
        >
          <PlusIcon className="size-4" />
          记一笔
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">账户列表</h2>
            <span className="text-xs text-muted-foreground">{accounts.length} 个账户</span>
          </div>
          {accounts.length === 0 ? (
            <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
              还没有账户。从右侧新建一个。
            </Card>
          ) : (
            <Card size="sm" className="divide-y divide-border py-0">
              {accounts.map((account) => (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currencyLabels[account.currency]} · {accountTypeLabels[account.type]} ·
                      {account.includeInNetWorth ? " 计入净资产" : " 不计入净资产"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMoney({
                        amountMinor: account.balanceMinor,
                        currency: account.currency,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">详情 →</span>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <aside aria-label="新建账户">
          <Card>
            <CardHeader>
              <CardTitle>新建账户</CardTitle>
            </CardHeader>
            <CardContent>
              <NewAccountForm />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
