import { cn } from "@/lib/utils";

export type FilterChipOption = {
  value: string;
  label: string;
  description?: string;
};

type FilterChipGroupProps = {
  name: string;
  label?: string;
  value?: string;
  options: readonly FilterChipOption[];
  columns?: "auto" | "two";
  hideLabel?: boolean;
};

export function FilterChipGroup({
  name,
  label,
  value = "",
  options,
  columns = "auto",
  hideLabel = false,
}: FilterChipGroupProps) {
  return (
    <fieldset className="grid gap-2">
      {label ? (
        <legend className={cn("text-sm font-medium", hideLabel && "sr-only")}>{label}</legend>
      ) : null}
      <div
        className={cn(
          "grid gap-2",
          columns === "two" ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {options.map((option) => (
          <label key={option.value} className="min-w-0">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === value}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-10 cursor-pointer flex-col justify-center rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors",
                "hover:bg-muted/60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50",
                "peer-checked:border-foreground/30 peer-checked:bg-foreground peer-checked:text-background",
              )}
            >
              <span className="truncate font-medium">{option.label}</span>
              {option.description ? (
                <span className="truncate text-xs opacity-75">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
