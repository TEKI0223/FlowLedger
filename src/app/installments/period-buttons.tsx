"use client";

import { useFormStatus } from "react-dom";
import { MinusIcon, PlusIcon } from "lucide-react";
import {
  markInstallmentPeriodPaid,
  unmarkInstallmentPeriodPaid,
} from "@/app/actions/installments";
import { Button } from "@/components/ui/button";

type PeriodButtonsProps = {
  id: string;
  canMark: boolean;
  canUnmark: boolean;
};

export function PeriodButtons({ id, canMark, canUnmark }: PeriodButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={markInstallmentPeriodPaid.bind(null, id)}>
        <MarkButton disabled={!canMark} />
      </form>
      <form action={unmarkInstallmentPeriodPaid.bind(null, id)}>
        <UnmarkButton disabled={!canUnmark} />
      </form>
    </div>
  );
}

function MarkButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="default"
      size="lg"
      disabled={disabled || pending}
      aria-busy={pending}
      className="h-11 gap-1"
    >
      <PlusIcon className="size-4" />
      {pending ? "处理中…" : "本期已扣"}
    </Button>
  );
}

function UnmarkButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="lg"
      disabled={disabled || pending}
      aria-busy={pending}
      className="h-11 gap-1"
    >
      <MinusIcon className="size-4" />
      {pending ? "处理中…" : "撤回上一期"}
    </Button>
  );
}
