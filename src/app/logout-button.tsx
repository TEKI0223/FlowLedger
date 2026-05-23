"use client";

import { useFormStatus } from "react-dom";
import { LogOutIcon } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitLogout />
    </form>
  );
}

function SubmitLogout() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      aria-busy={pending}
      className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <LogOutIcon className="size-3.5" />
      {pending ? "退出中…" : "退出登录"}
    </Button>
  );
}
