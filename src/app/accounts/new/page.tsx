import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAccountForm } from "@/features/accounts/new-account-form";

export const dynamic = "force-dynamic";

export default function NewAccountPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新建账户</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>账户内容</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAccountForm />
        </CardContent>
      </Card>
    </main>
  );
}
