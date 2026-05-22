"use client";

import { useFormStatus } from "react-dom";
import { deleteTransaction } from "@/app/actions/transactions";

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
    <button className="danger-link" type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
