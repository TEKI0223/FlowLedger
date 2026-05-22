import Link from "next/link";
import { InlineAlert } from "@/components/ui/inline-alert";
import { MetricCell } from "@/components/ui/metric-cell";
import { getDashboardSummary } from "@/features/dashboard/data";
import { listAccounts } from "@/features/accounts/data";
import {
  listQuickEntryTemplates,
  type HydratedQuickEntryTemplate,
} from "@/features/quick-entry/data";
import {
  QuickEntryModal,
  type QuickEntryModalTemplate,
} from "@/features/quick-entry/quick-entry-modal";
import { listTransactions } from "@/features/transactions/data";
import { formatMoney, transactionTypeLabels } from "@/domain/finance";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

type MetricTone = "income" | "expense" | "transfer" | "adjustment";

export default async function Home({ searchParams }: HomeProps) {
  const [{ saved }, summary, accounts, quickEntryTemplates, transactions] = await Promise.all([
    searchParams,
    getDashboardSummary(),
    listAccounts(),
    listQuickEntryTemplates(),
    listTransactions(6),
  ]);

  const metrics: Array<{ label: string; value: string; note: string; tone?: MetricTone }> = [
    {
      label: "本月收入",
      value: formatMoney({ amountMinor: summary.income.JPY, currency: "JPY" }),
      note: "JPY 收入",
      tone: "income" as const,
    },
    {
      label: "本月支出",
      value: formatMoney({ amountMinor: summary.expense.JPY, currency: "JPY" }),
      note: "不含转账和调整",
      tone: "expense" as const,
    },
    {
      label: "本月结余",
      value: formatMoney({
        amountMinor: summary.income.JPY - summary.expense.JPY,
        currency: "JPY",
      }),
      note: "JPY 收入减支出",
      tone: "transfer" as const,
    },
    {
      label: "JPY 资产",
      value: formatMoney({ amountMinor: summary.assets.JPY, currency: "JPY" }),
      note: "含现金和钱包余额",
    },
    {
      label: "CNY 资产",
      value: formatMoney({ amountMinor: summary.assets.CNY, currency: "CNY" }),
      note: "未折算为日元",
    },
  ];
  const quickEntryModalTemplates = [
    ...quickEntryTemplates.map(toQuickEntryModalTemplate),
    {
      id: "temp",
      title: "临时记录",
      meta: "其他 / 日元现金",
      context: "默认 JPY 支出，保存后可以去交易页补充分类、账户和支付方式",
      amountHint: "待补全",
      badge: "TMP",
      theme: "temporary",
      typeLabel: "待补全",
      type: "temporary",
      currency: "JPY",
    } satisfies QuickEntryModalTemplate,
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

      {saved ? <InlineAlert>已保存，首页数据和最近记录已更新。</InlineAlert> : null}

      <section className="summary-grid" aria-label="财务概览">
        {metrics.map((metric) => (
          <MetricCell
            label={metric.label}
            value={metric.value}
            note={metric.note}
            tone={metric.tone}
            key={metric.label}
          />
        ))}
      </section>

      <div className="workspace">
        <div>
          <section className="section">
            <div className="section-heading">
              <h2>快捷记账</h2>
              <span className="small">来自数据库模板</span>
            </div>
            <QuickEntryModal templates={quickEntryModalTemplates} />
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
                      <strong>
                        {transaction.category?.name ??
                          transaction.note ??
                          transactionTypeLabels[transaction.type]}
                      </strong>
                      <span>
                        {transactionTypeLabels[transaction.type]} · {transaction.occurredOn}
                        {transaction.sourceAccount ? ` · ${transaction.sourceAccount.name}` : ""}
                        {transaction.targetAccount ? ` → ${transaction.targetAccount.name}` : ""}
                      </span>
                    </div>
                    <span className={`amount ${transaction.type}`}>
                      {formatMoney({
                        amountMinor: transaction.amountMinor,
                        currency: transaction.currency,
                      })}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="side-panel" aria-label="待处理事项和账户">
          <section className="task">
            <div className="task-top">
              <h2 className="task-title">账户余额</h2>
              <span className="pill">JPY / CNY</span>
            </div>
            <div className="account-grid">
              {accounts.slice(0, 6).map((account) => (
                <div className="account-row" key={account.id}>
                  <span>{account.name}</span>
                  <strong>
                    {formatMoney({
                      amountMinor: account.balanceMinor,
                      currency: account.currency,
                    })}
                  </strong>
                </div>
              ))}
            </div>
          </section>

          <section className="task">
            <div className="task-top">
              <h2 className="task-title">完整录入</h2>
              <span className="pill gold">高级</span>
            </div>
            <p>收入、转账、调整和需要改账户的复杂记录，继续从完整交易页处理。</p>
            <div className="task-action">
              <Link className="secondary-action" href="/transactions">
                打开交易页
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function toQuickEntryModalTemplate(template: HydratedQuickEntryTemplate): QuickEntryModalTemplate {
  return {
    id: template.id,
    title: template.name,
    meta: templateMeta(template),
    context: templateContext(template),
    amountHint: amountHint(template),
    badge: templateBadge(template),
    theme: templateTheme(template),
    typeLabel: transactionTypeLabels[template.type],
    type: template.type,
    currency: template.currency,
  };
}

function templateMeta(template: HydratedQuickEntryTemplate) {
  const primary = template.category?.name ?? transactionTypeLabels[template.type];
  const secondary =
    template.paymentMethod?.name ?? template.sourceAccount?.name ?? template.targetAccount?.name;

  return secondary ? `${primary} / ${secondary}` : primary;
}

function templateContext(template: HydratedQuickEntryTemplate) {
  const context = [
    template.category?.name,
    template.paymentMethod?.name,
    template.sourceAccount?.name,
    template.targetAccount?.name,
  ].filter(Boolean);

  return context.length > 0 ? context.join(" / ") : transactionTypeLabels[template.type];
}

function amountHint(template: HydratedQuickEntryTemplate) {
  if (template.amountMinor === null) {
    return "自填";
  }

  return formatMoney({
    amountMinor: template.amountMinor,
    currency: template.currency,
  });
}

function templateBadge(template: HydratedQuickEntryTemplate) {
  const id = template.paymentMethodId ?? template.sourceAccountId ?? template.targetAccountId ?? "";

  if (id.includes("apple")) {
    return "AP";
  }

  if (id.includes("paypay")) {
    return "PP";
  }

  if (id.includes("wechat")) {
    return "WX";
  }

  if (id.includes("alipay")) {
    return "AL";
  }

  if (id.includes("credit")) {
    return "CC";
  }

  if (id.includes("cash")) {
    return "CA";
  }

  if (id.includes("bank")) {
    return "BK";
  }

  return template.type === "income" ? "IN" : "¥";
}

function templateTheme(
  template: HydratedQuickEntryTemplate,
): "bank" | "card" | "wallet" | "cash" | "income" | "transfer" {
  if (template.type === "income") {
    return "income";
  }

  if (template.type === "transfer") {
    return "transfer";
  }

  const id = template.paymentMethodId ?? template.sourceAccountId ?? template.targetAccountId ?? "";

  if (id.includes("credit") || id.includes("apple")) {
    return "card";
  }

  if (id.includes("cash")) {
    return "cash";
  }

  if (id.includes("bank")) {
    return "bank";
  }

  return "wallet";
}
