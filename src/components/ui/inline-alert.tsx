import type { ReactNode } from "react";
import { CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type InlineAlertProps = {
  children: ReactNode;
  tone?: "success" | "danger";
  className?: string;
};

export function InlineAlert({ children, tone = "success", className }: InlineAlertProps) {
  const Icon = tone === "danger" ? XCircleIcon : CheckCircle2Icon;

  return (
    <Alert
      variant={tone === "danger" ? "destructive" : "default"}
      className={cn(
        "mb-3",
        tone === "success" && "border-income/30 bg-income/5 text-income [&>svg]:text-income",
        className,
      )}
    >
      <Icon />
      <AlertDescription className="text-inherit">{children}</AlertDescription>
    </Alert>
  );
}
