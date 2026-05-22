import Link from "next/link";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { TransactionForm } from "./transaction-form";
import { createTransaction } from "@/app/actions/transactions";
import { getTransactionLookups } from "@/features/lookups/data";
import { listTransactions } from "@/features/transactions/data";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";
import { todayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [lookups, transactions] = await Promise.all([
    getTransactionLookups(),
    listTransactions(40),
  ]);

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
                    <strong>
                      {transaction.category?.name ??
                        transaction.note ??
                        transactionTypeLabels[transaction.type]}
                    </strong>
                    <span>
                      {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                      {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                      {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                      {transaction.paymentMethod ? ` · ${transaction.paymentMethod.name}` : ""}
                    </span>
                  </div>
                  <span className={`amount ${transaction.type}`}>
                    {transaction.type === "transfer" ? "转账 " : ""}
                    {formatMoney({
                      amountMinor: transaction.amountMinor,
                      currency: transaction.currency,
                    })}
                  </span>
                  <div className="record-actions row-actions">
                    <Link className="text-link" href={`/transactions/${transaction.id}`}>
                      编辑
                    </Link>
                    <DeleteTransactionButton id={transaction.id} />
                  </div>
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
            <TransactionForm
              action={createTransaction}
              lookups={lookups}
              defaults={{
                occurredOn: todayIsoDate(),
                type: "expense",
                currency: "JPY",
              }}
              submitLabel="保存交易"
            />
          </section>
        </aside>
      </div>
    </main>
  );
}
