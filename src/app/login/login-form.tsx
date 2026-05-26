"use client";

import { useActionState } from "react";
import { loginAction, type LoginActionState } from "@/app/actions/auth";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PublicFlowLedgerUser } from "@/lib/auth";

const initialState: LoginActionState = {};

type LoginFormProps = {
  from: string;
  users: PublicFlowLedgerUser[];
};

export function LoginForm({ from, users }: LoginFormProps) {
  const [state, formAction] = useActionState<LoginActionState, FormData>(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="from" value={from} />
      {state.error ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}
      <div className="grid gap-2">
        <Label htmlFor="userId">用户</Label>
        <select
          id="userId"
          name="userId"
          required
          className="h-11 rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          defaultValue={users[0]?.id}
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">访问密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="h-11 text-base"
        />
      </div>
      <SubmitButton>登录</SubmitButton>
    </form>
  );
}
