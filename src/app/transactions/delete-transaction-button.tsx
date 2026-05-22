"use client";

import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteTransaction } from "@/app/actions/transactions";
import { Button } from "@/components/ui/button";

type DeleteTransactionButtonProps = {
  id: string;
};

export function DeleteTransactionButton({ id }: DeleteTransactionButtonProps) {
  return (
    <form action={deleteTransaction.bind(null, id)}>
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
