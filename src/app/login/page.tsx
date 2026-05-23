import { LoginForm } from "./login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { from } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8">
      <header className="space-y-1 pb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">FlowLedger</h1>
        <p className="text-sm text-muted-foreground">个人现金流与账户面板</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>登录</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm from={from ?? "/"} />
        </CardContent>
      </Card>
    </main>
  );
}
