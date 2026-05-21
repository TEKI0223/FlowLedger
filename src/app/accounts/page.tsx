import Link from "next/link";
import { createAccount } from "@/app/actions/accounts";
import { listAccounts } from "@/features/accounts/data";
import { accountTypeLabels, currencies, currencyLabels, formatMoney } from "@/domain/finance";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const { error } = await searchParams;
  const accounts = await listAccounts();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/">
            ← 首页
          </Link>
          <h1 className="brand-title">账户</h1>
          <p className="brand-subtitle">管理现金、银行、信用卡和余额账户</p>
        </div>
        <Link className="primary-action link-button" href="/transactions">
          记一笔
        </Link>
      </header>

      <div className="workspace">
        <section className="section">
          <div className="section-heading">
            <h2>账户列表</h2>
            <span className="small">{accounts.length} 个账户</span>
          </div>
          <div className="records">
            {accounts.map((account) => (
              <article className="record" key={account.id}>
                <div className="record-main">
                  <strong>{account.name}</strong>
                  <span>
                    {currencyLabels[account.currency]} · {accountTypeLabels[account.type]} ·
                    {account.includeInNetWorth ? " 计入净资产" : " 不计入净资产"}
                  </span>
                </div>
                <div className="record-actions">
                  <strong>
                    {formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}
                  </strong>
                  <Link className="text-link" href={`/accounts/${account.id}`}>
                    编辑
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="side-panel" aria-label="新建账户">
          <section className="task">
            <div className="task-top">
              <h2 className="task-title">新建账户</h2>
              <span className="pill">M1</span>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <form action={createAccount} className="form-grid">
              <label>
                <span>账户名称</span>
                <input name="name" required placeholder="例如：日本银行账户" />
              </label>

              <label>
                <span>账户类型</span>
                <select name="type" required defaultValue="bank">
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>币种</span>
                <select name="currency" required defaultValue="JPY">
                  {currencies.map((currency) => (
                    <option value={currency} key={currency}>
                      {currency} · {currencyLabels[currency]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>初始余额</span>
                <input name="initialBalance" inputMode="decimal" placeholder="0" defaultValue="0" />
              </label>

              <label className="checkbox-row">
                <input name="includeInNetWorth" type="checkbox" defaultChecked />
                <span>计入净资产</span>
              </label>

              <label>
                <span>备注</span>
                <textarea name="note" rows={3} placeholder="可选" />
              </label>

              <button className="primary-action" type="submit">
                保存账户
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
