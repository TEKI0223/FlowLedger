import Link from "next/link";
import { getDashboardSummary } from "@/features/dashboard/data";
import { listAccounts } from "@/features/accounts/data";
import { listTransactions } from "@/features/transactions/data";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";

export const dynamic = "force-dynamic";

const tasks = [
  {
    title: "信用卡 A",
    badge: "账单",
    text: "本期消费 ¥82,340，预计下月 10 日从日本银行账户扣款。"
  },
  {
    title: "电费",
    badge: "待填",
    tone: "warn",
    text: "周期项目已生成，等待录入本月实际金额。"
  },
  {
    title: "退款",
    badge: "追踪",
    tone: "gold",
    text: "Amazon 退款 ¥3,980，预计 3 个工作日内回到信用卡。"
  }
];

export default async function Home() {
  const [summary, accounts, transactions] = await Promise.all([getDashboardSummary(), listAccounts(), listTransactions(6)]);

  const metrics = [
    { label: "本月收入", value: formatMoney({ amountMinor: summary.income.JPY, currency: "JPY" }), note: "JPY 收入" },
    { label: "本月支出", value: formatMoney({ amountMinor: summary.expense.JPY, currency: "JPY" }), note: "不含转账和调整" },
    { label: "JPY 资产", value: formatMoney({ amountMinor: summary.assets.JPY, currency: "JPY" }), note: "含现金和钱包余额" },
    { label: "CNY 资产", value: formatMoney({ amountMinor: summary.assets.CNY, currency: "CNY" }), note: "未折算为日元" }
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1 className="brand-title">FlowLedger</h1>
          <p className="brand-subtitle">个人现金流与账户面板</p>
        </div>
        <Link className="primary-action link-button" href="/transactions">
          记一笔
        </Link>
      </header>

      <section className="summary-grid" aria-label="财务概览">
        {metrics.map((metric) => (
          <article className="metric" key={metric.label}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            <p className="metric-note">{metric.note}</p>
          </article>
        ))}
      </section>

      <div className="workspace">
        <div>
          <section className="section">
            <div className="section-heading">
              <h2>开始使用</h2>
              <span className="small">M1 基础闭环</span>
            </div>
            <div className="quick-grid">
              <Link className="quick-button link-card" href="/transactions">
                <strong>记一笔</strong>
                <span>收入、支出、转账、调整</span>
              </Link>
              <Link className="quick-button link-card" href="/accounts">
                <strong>账户</strong>
                <span>创建、编辑、查看余额</span>
              </Link>
            </div>
          </section>

          <section className="section">
            <div className="section-heading">
              <h2>最近记录</h2>
              <span className="small">消费和转账分开统计</span>
            </div>
            <div className="records">
              {transactions.length === 0 ? (
                <p className="empty-state">还没有真实交易。先点击“记一笔”创建第一条记录。</p>
              ) : (
                transactions.map((transaction) => (
                  <article className="record" key={transaction.id}>
                    <div className="record-main">
                      <strong>{transaction.category?.name ?? transaction.note ?? transactionTypeLabels[transaction.type]}</strong>
                      <span>
                        {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                        {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                        {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                      </span>
                    </div>
                    <span className={`amount ${transaction.type}`}>
                      {formatMoney({ amountMinor: transaction.amountMinor, currency: transaction.currency })}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="side-panel" aria-label="待处理事项和账户">
          {tasks.map((task) => (
            <article className="task" key={task.title}>
              <div className="task-top">
                <h2 className="task-title">{task.title}</h2>
                <span className={`pill ${task.tone ?? ""}`}>{task.badge}</span>
              </div>
              <p>{task.text}</p>
            </article>
          ))}

          <section className="task">
            <div className="task-top">
              <h2 className="task-title">账户余额</h2>
              <span className="pill">JPY / CNY</span>
            </div>
            <div className="account-grid">
              {accounts.slice(0, 6).map((account) => (
                <div className="account-row" key={account.id}>
                  <span>{account.name}</span>
                  <strong>{formatMoney({ amountMinor: account.balanceMinor, currency: account.currency })}</strong>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
