"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: ReactNode;
  className?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "保存中…",
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      aria-busy={pending}
      className={cn("h-11 w-full text-base font-semibold", className)}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
