"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function SubmitButton({
  children,
  pendingLabel = "保存中…",
  className,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button
      type="submit"
      size="lg"
      disabled={isDisabled}
      aria-busy={pending}
      className={cn("h-11 w-full text-base font-semibold", className)}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
