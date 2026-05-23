"use client";

import { useFormStatus } from "react-dom";
import { RotateCcwIcon } from "lucide-react";
import { resetQuickEntryTemplateUsage } from "@/app/actions/quick-entry-templates";
import { Button } from "@/components/ui/button";

type Props = {
  id: string;
};

export function ResetUsageButton({ id }: Props) {
  return (
    <form action={resetQuickEntryTemplateUsage.bind(null, id)}>
      <Submit />
    </form>
  );
}

function Submit() {
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
      {pending ? "处理中…" : "重置次数"}
    </Button>
  );
}
