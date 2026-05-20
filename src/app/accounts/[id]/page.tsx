import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAccount } from "@/app/actions/accounts";
import { getAccount } from "@/features/accounts/data";
import { accountTypeLabels, currencies, currencyLabels, formatMoney } from "@/domain/finance";

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

  const action = updateAccount.bind(null, account.id);

  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/accounts">
            ← 账户
          </Link>
          <h1 className="brand-title">编辑账户</h1>
          <p className="brand-subtitle">
            当前余额：{formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
          </p>
        </div>
      </header>

      <section className="task">
        <form action={action} className="form-grid">
          <label>
            <span>账户名称</span>
            <input name="name" required defaultValue={account.name} />
          </label>

          <label>
            <span>账户类型</span>
            <select name="type" required defaultValue={account.type}>
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>币种</span>
            <select name="currency" required defaultValue={account.currency}>
              {currencies.map((currency) => (
                <option value={currency} key={currency}>
                  {currency} · {currencyLabels[currency]}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input name="includeInNetWorth" type="checkbox" defaultChecked={account.includeInNetWorth} />
            <span>计入净资产</span>
          </label>

          <label>
            <span>备注</span>
            <textarea name="note" rows={4} defaultValue={account.note ?? ""} />
          </label>

          <button className="primary-action" type="submit">
            保存修改
          </button>
        </form>
      </section>
    </main>
  );
}
