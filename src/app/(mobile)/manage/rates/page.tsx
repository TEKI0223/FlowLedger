import { updateExchangeRates } from "@/app/actions/exchange-rates";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getExchangeRate, listExchangeRates } from "@/features/exchange-rates/data";
import { RateForm } from "./rate-form";

type ManageRatesPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function ManageRatesPage({ searchParams }: ManageRatesPageProps) {
  const [{ saved }, cnyToJpy, rates] = await Promise.all([
    searchParams,
    getExchangeRate("CNY", "JPY"),
    listExchangeRates(),
  ]);
  const jpyToCny = rates.find((rate) => rate.fromCurrency === "JPY" && rate.toCurrency === "CNY");
  const updatedAt =
    rates.find((rate) => rate.fromCurrency === "CNY" && rate.toCurrency === "JPY")?.updatedAt ??
    jpyToCny?.updatedAt;
  const defaultCnyToJpy = cnyToJpy === null ? "" : formatRateForInput(cnyToJpy);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">汇率</h1>
          <p className="text-sm text-muted-foreground">手动维护首页净资产折算使用的汇率。</p>
        </div>
      </header>

      {saved ? <InlineAlert>汇率已保存，首页净资产会使用最新汇率。</InlineAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>人民币折算日元</CardTitle>
          <CardDescription>保存后会同步写入反向汇率。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <RateForm action={updateExchangeRates} defaultCnyToJpy={defaultCnyToJpy} />

          <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">当前 CNY → JPY</span>
              <span className="font-medium tabular-nums">
                {cnyToJpy === null ? "未设置" : `1 CNY = ${formatRate(cnyToJpy)} JPY`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">当前 JPY → CNY</span>
              <span className="font-medium tabular-nums">
                {jpyToCny ? `1 JPY = ${formatRate(jpyToCny.rate)} CNY` : "未设置"}
              </span>
            </div>
            {updatedAt ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">更新时间</span>
                <span className="text-right text-xs text-muted-foreground">
                  {new Date(updatedAt).toLocaleString("zh-CN", { hour12: false })}
                </span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function formatRate(rate: number): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 6,
    minimumFractionDigits: 0,
  }).format(rate);
}

function formatRateForInput(rate: number): string {
  return Number.isInteger(rate)
    ? String(rate)
    : rate.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}
