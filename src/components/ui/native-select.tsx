import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type NativeSelectProps = React.ComponentProps<"select">;

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "flex h-11 w-full appearance-none items-center rounded-md border border-input bg-background px-3 pr-9 text-base text-foreground",
          "ring-offset-background transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
