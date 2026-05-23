import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormActionBarProps = {
  formId: string;
  submitLabel: string;
  cancelHref: string;
  dangerAction?: ReactNode;
};

export function FormActionBar({
  formId,
  submitLabel,
  cancelHref,
  dangerAction,
}: FormActionBarProps) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
      <div className="justify-self-start">{dangerAction}</div>
      <Button type="submit" form={formId} size="lg" className="h-11 w-full text-base font-semibold">
        {submitLabel}
      </Button>
      <Link
        href={cancelHref}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "h-11")}
      >
        取消
      </Link>
    </div>
  );
}
