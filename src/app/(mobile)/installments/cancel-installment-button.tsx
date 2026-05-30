"use client";

import { useFormStatus } from "react-dom";
import { BanIcon, RotateCcwIcon } from "lucide-react";
import { cancelInstallmentPlan, reopenInstallmentPlan } from "@/app/actions/installments";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
  isCancelled: boolean;
};

export function CancelInstallmentButton({ id, isCancelled }: Props) {
  if (isCancelled) {
    return (
      <form action={reopenInstallmentPlan.bind(null, id)}>
        <ReopenButton />
      </form>
    );
  }
  return (
    <form action={cancelInstallmentPlan.bind(null, id)}>
      <CancelButton />
    </form>
  );
}

function CancelButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      className="h-8 gap-1 text-xs"
    >
      <BanIcon className="size-3.5" />
      {pending ? "处理中…" : "取消分期"}
    </Button>
  );
}

function ReopenButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      className="h-8 gap-1 text-xs"
    >
      <RotateCcwIcon className="size-3.5" />
      {pending ? "处理中…" : "重新启用"}
    </Button>
  );
}
