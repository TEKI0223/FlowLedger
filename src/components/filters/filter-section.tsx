import { ChevronDownIcon } from "lucide-react";

type FilterSectionProps = {
  title: string;
  summary?: string;
  children: React.ReactNode;
};

export function FilterSection({ title, summary = "全部", children }: FilterSectionProps) {
  return (
    <details className="group rounded-lg border border-border bg-background">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm marker:hidden">
        <span className="font-medium">{title}</span>
        <span className="ml-auto min-w-0 truncate text-xs text-muted-foreground">{summary}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border p-3">{children}</div>
    </details>
  );
}
