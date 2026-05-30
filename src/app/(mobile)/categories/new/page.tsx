import { createCategory } from "@/app/actions/categories";
import { CategoryForm } from "@/features/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listParentCategoryOptions } from "@/features/categories/data";

export const dynamic = "force-dynamic";

type NewCategoryPageProps = {
  searchParams: Promise<{ parentId?: string }>;
};

export default async function NewCategoryPage({ searchParams }: NewCategoryPageProps) {
  const [{ parentId }, parentOptions] = await Promise.all([
    searchParams,
    listParentCategoryOptions(),
  ]);

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex flex-col gap-3 pb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">新增分类</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>分类内容</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryForm
            action={createCategory}
            parentOptions={parentOptions}
            defaults={{ parentId }}
            submitLabel="保存分类"
          />
        </CardContent>
      </Card>
    </main>
  );
}
