"use client";

import { useFormStatus } from "react-dom";
import { Trash2Icon } from "lucide-react";
import { deleteQuickEntryTemplate } from "@/app/actions/quick-entry-templates";
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

type Props = {
  id: string;
  name: string;
};

export function DeleteTemplateButton({ id, name }: Props) {
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
          <AlertDialogTitle>删除「{name}」？</AlertDialogTitle>
          <AlertDialogDescription>
            模板删除后历史交易记录保留。如果只想暂时隐藏，可以在编辑里关闭「启用」。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <form action={deleteQuickEntryTemplate.bind(null, id)}>
            <ConfirmDelete />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmDelete() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} aria-busy={pending}>
      {pending ? "删除中…" : "确认删除"}
    </Button>
  );
}
