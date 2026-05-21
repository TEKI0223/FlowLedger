import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createQuickEntryTransaction,
  createTemporaryTransaction,
} from "@/app/actions/transactions";
import { InlineAlert } from "@/components/ui/inline-alert";
import { formatMinorForInput, transactionTypeLabels } from "@/domain/finance";
import { getQuickEntryTemplate } from "@/features/quick-entry/data";
import { todayIsoDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

type QuickEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function QuickEntryPage({ params, searchParams }: QuickEntryPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);

  if (id === "temp") {
    return <TemporaryEntryPage error={error} />;
  }

  const template = await getQuickEntryTemplate(id);

  if (!template) {
    notFound();
  }

  const saveAction = createQuickEntryTransaction.bind(null, template.id);
  const amountDefault =
    template.amountMinor === null
      ? undefined
      : formatMinorForInput({
          amountMinor: template.amountMinor,
          currency: template.currency,
        });

  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/">
            ← 首页
          </Link>
          <h1 className="brand-title">{template.name}</h1>
          <p className="brand-subtitle">快捷记账会使用模板里的账户、分类和支付方式</p>
        </div>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <section className="quick-entry-panel">
        <div className="quick-entry-context">
          <span className={`quick-entry-type ${template.type}`}>
            {transactionTypeLabels[template.type]}
          </span>
          <strong>{template.category?.name ?? "无分类"}</strong>
          <span>
            {template.paymentMethod?.name ?? template.sourceAccount?.name ?? "未设置支付方式"}
            {template.sourceAccount ? ` · ${template.sourceAccount.name}` : ""}
          </span>
        </div>

        <form action={saveAction} className="quick-entry-form">
          <label className="amount-field">
            <span>金额</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              autoFocus
              placeholder={template.currency === "JPY" ? "1200" : "38.50"}
              defaultValue={amountDefault}
            />
          </label>

          <div className="compact-form-grid">
            <label>
              <span>日期</span>
              <input name="occurredOn" type="date" required defaultValue={todayIsoDate()} />
            </label>
            <label>
              <span>币种</span>
              <input value={template.currency} readOnly aria-label="币种" />
            </label>
          </div>

          <label>
            <span>备注</span>
            <textarea name="note" rows={3} placeholder={template.note ?? "可选"} />
          </label>

          <div className="quick-entry-actions">
            <button className="primary-action" type="submit">
              保存
            </button>
            <Link className="secondary-action" href="/transactions">
              完整录入
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

function TemporaryEntryPage({ error }: { error?: string }) {
  return (
    <main className="shell narrow-shell">
      <header className="topbar">
        <div className="brand">
          <Link className="back-link" href="/">
            ← 首页
          </Link>
          <h1 className="brand-title">临时记录</h1>
          <p className="brand-subtitle">先保存一笔待补全支出，稍后从交易页编辑细节</p>
        </div>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <section className="quick-entry-panel">
        <div className="quick-entry-context">
          <span className="quick-entry-type adjustment">待补全</span>
          <strong>其他</strong>
          <span>默认 JPY 账户，保存后可编辑分类、账户和支付方式</span>
        </div>

        <form action={createTemporaryTransaction} className="quick-entry-form">
          <label className="amount-field">
            <span>金额</span>
            <input name="amount" inputMode="decimal" required autoFocus placeholder="1200" />
          </label>

          <div className="compact-form-grid">
            <label>
              <span>日期</span>
              <input name="occurredOn" type="date" required defaultValue={todayIsoDate()} />
            </label>
            <label>
              <span>币种</span>
              <input value="JPY" readOnly aria-label="币种" />
            </label>
          </div>

          <label>
            <span>备注</span>
            <textarea name="note" rows={3} placeholder="可选，例如店名或用途" />
          </label>

          <div className="quick-entry-preview">保存为 JPY 支出 · 待补全</div>

          <div className="quick-entry-actions">
            <button className="primary-action" type="submit">
              保存临时记录
            </button>
            <Link className="secondary-action" href="/transactions">
              完整录入
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
