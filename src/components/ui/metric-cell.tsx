import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTone = "income" | "expense" | "transfer" | "adjustment";

type MetricCellProps = {
  label: string;
  value: string;
  note?: string;
  tone?: MetricTone;
};

const toneClasses: Record<MetricTone, string> = {
  income: "text-income",
  expense: "text-expense",
  transfer: "text-transfer",
  adjustment: "text-adjustment",
};

export function MetricCell({ label, value, note, tone }: MetricCellProps) {
  return (
    <Card size="sm" className="px-4 py-3 gap-1">
      <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone && toneClasses[tone])}>
        {value}
      </p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </Card>
  );
}
