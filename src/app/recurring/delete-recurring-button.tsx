"use client";

import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteRecurringItem } from "@/app/actions/recurring";
import { Button } from "@/components/ui/button";

type DeleteRecurringButtonProps = {
  id: string;
};

export function DeleteRecurringButton({ id }: DeleteRecurringButtonProps) {
  return (
    <form action={deleteRecurringItem.bind(null, id)}>
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2Icon className="size-3.5" />
      {pending ? "删除中…" : "删除"}
    </Button>
  );
}
