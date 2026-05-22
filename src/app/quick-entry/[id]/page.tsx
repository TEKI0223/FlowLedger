import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          首页
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{template.name}</h1>
        <p className="text-sm text-muted-foreground">快捷记账会使用模板里的账户、分类和支付方式</p>
      </header>

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Badge variant="secondary" className="text-xs">
              {transactionTypeLabels[template.type]}
            </Badge>
            <p className="text-base font-semibold">{template.category?.name ?? "无分类"}</p>
            <p className="text-xs text-muted-foreground">
              {template.paymentMethod?.name ?? template.sourceAccount?.name ?? "未设置支付方式"}
              {template.sourceAccount ? ` · ${template.sourceAccount.name}` : ""}
            </p>
          </div>

          <QuickEntryForm
            mode="template"
            templateId={template.id}
            currency={template.currency}
            amountDefault={amountDefault}
            noteHint={template.note ?? "可选"}
            autoFocusAmount
          />
        </CardContent>
      </Card>
    </main>
  );
}

function TemporaryEntryPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="space-y-1 pb-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          首页
        </Link>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">临时记录</h1>
        <p className="text-sm text-muted-foreground">先保存一笔待补全支出，稍后从交易页编辑细节</p>
      </header>

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Badge variant="secondary" className="text-xs">
              待补全
            </Badge>
            <p className="text-base font-semibold">其他</p>
            <p className="text-xs text-muted-foreground">
              默认 JPY 账户，保存后可编辑分类、账户和支付方式
            </p>
          </div>

          <QuickEntryForm mode="temporary" autoFocusAmount />
        </CardContent>
      </Card>
    </main>
  );
}
