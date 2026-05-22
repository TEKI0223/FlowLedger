import Link from "next/link";
import { notFound } from "next/navigation";
import { EditAccountForm } from "./edit-account-form";
import { getAccount } from "@/features/accounts/data";
import { formatMoney } from "@/domain/finance";

export const dynamic = "force-dynamic";

type AccountEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AccountEditPage({ params }: AccountEditPageProps) {
  const { id } = await params;
  const account = await getAccount(id);

  if (!account) {
    notFound();
  }

  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/accounts">
            ← 账户
          </Link>
          <h1 className="brand-title">编辑账户</h1>
          <p className="brand-subtitle">
            当前余额：
            {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
          </p>
        </div>
      </header>

      <section className="task">
        <EditAccountForm account={account} />
      </section>
    </main>
  );
}
