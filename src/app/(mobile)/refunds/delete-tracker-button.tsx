"use client";

import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteRefundTracker } from "@/app/actions/refunds";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeleteTrackerButtonProps = {
  id: string;
  disabled?: boolean;
};

export function DeleteTrackerButton({ id, disabled }: DeleteTrackerButtonProps) {
  if (disabled) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="h-8 text-xs text-muted-foreground"
        title="还有已到账金额，无法删除"
      >
        <Trash2Icon className="size-3.5" />
        删除
      </Button>
    );
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
            删除
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除这个退款追踪？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后不可恢复。如果之后又收到退款，需要重新挂一条追踪。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <form action={deleteRefundTracker.bind(null, id)}>
            <ConfirmDeleteButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} aria-busy={pending}>
      {pending ? "删除中…" : "确认删除"}
    </Button>
  );
}
