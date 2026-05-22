import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMinorForInput, transactionTypeLabels } from "@/domain/finance";
import { getQuickEntryTemplate } from "@/features/quick-entry/data";
import { QuickEntryForm } from "@/features/quick-entry/quick-entry-form";

export const dynamic = "force-dynamic";

type QuickEntryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function QuickEntryPage({ params }: QuickEntryPageProps) {
  const { id } = await params;

  if (id === "temp") {
    return <TemporaryEntryPage />;
  }

  const template = await getQuickEntryTemplate(id);

  if (!template) {
    notFound();
  }

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

        <QuickEntryForm
          mode="template"
          templateId={template.id}
          currency={template.currency}
          amountDefault={amountDefault}
          noteHint={template.note ?? "可选"}
          autoFocusAmount
        />
      </section>
    </main>
  );
}

function TemporaryEntryPage() {
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

      <section className="quick-entry-panel">
        <div className="quick-entry-context">
          <span className="quick-entry-type adjustment">待补全</span>
          <strong>其他</strong>
          <span>默认 JPY 账户，保存后可编辑分类、账户和支付方式</span>
        </div>

        <QuickEntryForm mode="temporary" autoFocusAmount />
      </section>
    </main>
  );
}
