import Image from "next/image";
import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams;
  const users = getPublicUsers();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      <header className="flex items-center gap-3 pb-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white p-2 shadow-sm">
          <Image
            src="/icons/app-icon.png"
            alt=""
            width={32}
            height={32}
            className="size-8"
            unoptimized
          />
        </span>
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">FlowLedger</h1>
          <p className="text-sm text-muted-foreground">个人现金流与账户面板</p>
        </div>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>登录</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm from={from ?? "/"} users={users} />
        </CardContent>
      </Card>
    </main>
  );
}
