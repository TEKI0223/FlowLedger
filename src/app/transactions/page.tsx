import Link from "next/link";
import { createTransaction } from "@/app/actions/transactions";
import { getTransactionLookups } from "@/features/lookups/data";
import { listTransactions } from "@/features/transactions/data";
import { currencies, currencyLabels, formatMoney, transactionTypeLabels } from "@/domain/finance";
import { todayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [lookups, transactions] = await Promise.all([getTransactionLookups(), listTransactions(40)]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/">
            ← 首页
          </Link>
          <h1 className="brand-title">交易</h1>
          <p className="brand-subtitle">收入、支出、转账和余额调整</p>
        </div>
        <Link className="secondary-action link-button" href="/accounts">
          账户
        </Link>
      </header>

      <div className="workspace">
        <section className="section">
          <div className="section-heading">
            <h2>最近交易</h2>
            <span className="small">{transactions.length} 条</span>
          </div>
          <div className="records">
            {transactions.length === 0 ? (
              <p className="empty-state">还没有交易。先从右侧创建一笔收入、支出、转账或调整。</p>
            ) : (
              transactions.map((transaction) => (
                <article className="record" key={transaction.id}>
                  <div className="record-main">
                    <strong>{transaction.category?.name ?? transaction.note ?? transactionTypeLabels[transaction.type]}</strong>
                    <span>
                      {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                      {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                      {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                      {transaction.paymentMethod ? ` · ${transaction.paymentMethod.name}` : ""}
                    </span>
                  </div>
                  <span className={`amount ${transaction.type}`}>
                    {transaction.type === "transfer" ? "转账 " : ""}
                    {formatMoney({ amountMinor: transaction.amountMinor, currency: transaction.currency })}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="side-panel" aria-label="新建交易">
          <section className="task">
            <div className="task-top">
              <h2 className="task-title">记一笔</h2>
              <span className="pill">余额同步</span>
            </div>
            <form action={createTransaction} className="form-grid">
              <label>
                <span>日期</span>
                <input name="occurredOn" type="date" required defaultValue={todayIsoDate()} />
              </label>

              <label>
                <span>类型</span>
                <select name="type" required defaultValue="expense">
                  {Object.entries(transactionTypeLabels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>金额</span>
                <input name="amount" inputMode="decimal" required placeholder="例如：1200" />
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
                <span>分类</span>
                <select name="categoryId" defaultValue="">
                  <option value="">无分类</option>
                  {lookups.categories.map((category) => (
                    <option value={category.id} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>来源账户</span>
                <select name="sourceAccountId" defaultValue="">
                  <option value="">不选择</option>
                  {lookups.accounts.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name} · {account.currency}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>目标账户</span>
                <select name="targetAccountId" defaultValue="">
                  <option value="">不选择</option>
                  {lookups.accounts.map((account) => (
                    <option value={account.id} key={account.id}>
                      {account.name} · {account.currency}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>支付方式</span>
                <select name="paymentMethodId" defaultValue="">
                  <option value="">不选择</option>
                  {lookups.paymentMethods.map((paymentMethod) => (
                    <option value={paymentMethod.id} key={paymentMethod.id}>
                      {paymentMethod.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>备注</span>
                <textarea name="note" rows={3} placeholder="可选" />
              </label>

              <button className="primary-action" type="submit">
                保存交易
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
