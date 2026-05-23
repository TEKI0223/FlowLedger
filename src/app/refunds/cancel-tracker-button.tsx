"use client";

import { useFormStatus } from "react-dom";
import { BanIcon, RotateCcwIcon } from "lucide-react";
import { cancelRefundTracker, reopenRefundTracker } from "@/app/actions/refunds";
import { Button } from "@/components/ui/button";

type CancelTrackerButtonProps = {
  id: string;
  isCancelled: boolean;
};

export function CancelTrackerButton({ id, isCancelled }: CancelTrackerButtonProps) {
  if (isCancelled) {
    return (
      <form action={reopenRefundTracker.bind(null, id)}>
        <ReopenButton />
      </form>
    );
  }
  return (
    <form action={cancelRefundTracker.bind(null, id)}>
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
      {pending ? "处理中…" : "取消追踪"}
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
