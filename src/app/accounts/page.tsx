import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountCard } from "@/features/accounts/account-card";
import { listAccounts } from "@/features/accounts/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await listAccounts();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">账户一览</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{accounts.length} 个账户</span>
            <Link
              href="/accounts/new"
              className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-8 gap-1")}
            >
              <PlusIcon className="size-3.5" />
              新建
            </Link>
          </div>
        </div>
        {accounts.length === 0 ? (
          <Card size="sm" className="px-4 py-6 text-center text-sm text-muted-foreground">
            还没有账户。先新建一个账户。
          </Card>
        ) : (
          <div className="grid gap-3">
            {accounts.map((account) => (
              <AccountCard account={account} key={account.id} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
