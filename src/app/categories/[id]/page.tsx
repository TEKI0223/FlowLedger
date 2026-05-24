import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { updateCategory } from "@/app/actions/categories";
import { CategoryForm } from "@/features/categories/category-form";
import { DeleteCategoryButton } from "@/features/categories/delete-category-button";
import { buttonVariants } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategory, listParentCategoryOptions } from "@/features/categories/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CategoryPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const [category, parentOptions] = await Promise.all([
    getCategory(id),
    listParentCategoryOptions(id),
  ]);

  if (!category) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{category.name}</h1>
          <div className="flex items-center gap-2">
            <Link
              href={`/categories/new?parentId=${category.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
            >
              <PlusIcon className="size-3.5" />
              添加子类
            </Link>
            <DeleteCategoryButton id={category.id} name={category.name} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          使用 {category.usageCount} 次
          {category.lastUsedAt ? ` · 最近使用 ${category.lastUsedAt.slice(0, 10)}` : ""}
        </p>
      </header>

      {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}

      <Card>
        <CardHeader>
          <CardTitle>分类内容</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={updateCategory.bind(null, category.id)}
            parentOptions={parentOptions}
            defaults={{
              name: category.name,
              parentId: category.parentId,
            }}
            submitLabel="保存修改"
          />
        </CardContent>
      </Card>

      <section className="mt-4 grid gap-2 rounded-lg border border-border px-4 py-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">交易引用</span>
          <span className="font-medium tabular-nums">{category.transactionCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">快捷模板引用</span>
          <span className="font-medium tabular-nums">{category.templateCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">周期项目引用</span>
          <span className="font-medium tabular-nums">{category.recurringCount}</span>
        </div>
      </section>
    </main>
  );
}
