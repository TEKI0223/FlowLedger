import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getTransactionLookups } from "@/features/lookups/data";
import { PhotoEntryForm } from "@/features/transactions/photo-entry-form";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PhotoEntryPage() {
  const lookups = await getTransactionLookups();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex items-center justify-between gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">拍照记账</h1>
        <Link
          href="/entry"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 gap-1 text-xs text-muted-foreground",
          )}
        >
          <ArrowLeftIcon className="size-3.5" />
          返回
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>识别小票自动预填</CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoEntryForm lookups={lookups} />
        </CardContent>
      </Card>
    </main>
  );
}
