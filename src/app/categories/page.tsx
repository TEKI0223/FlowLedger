import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, FolderTreeIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listCategories, type CategoryRow } from "@/features/categories/data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  const { roots, childrenByParent } = groupCategories(categories);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex items-start justify-between gap-3 pb-5">
        <div className="space-y-1">
          <Link
            href="/manage"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            管理
          </Link>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">交易分类</h1>
          <p className="text-sm text-muted-foreground">维护分类层级和常用排序。</p>
        </div>
        <Link
          href="/categories/new"
          className={cn(buttonVariants({ size: "sm" }), "h-8 shrink-0")}
        >
          <PlusIcon className="size-3.5" />
          新增
        </Link>
      </header>

      {categories.length === 0 ? (
        <Card size="sm" className="items-center px-4 py-8 text-center">
          <FolderTreeIcon className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">还没有分类</p>
            <p className="text-xs text-muted-foreground">新增分类后会出现在记账表单里。</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {roots.map((category) => (
            <CategoryGroup
              key={category.id}
              category={category}
              childCategories={childrenByParent.get(category.id) ?? []}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function CategoryGroup({
  category,
  childCategories,
}: {
  category: CategoryRow;
  childCategories: CategoryRow[];
}) {
  return (
    <Card size="sm" className="py-0">
      <CategoryLink category={category} isRoot />
      {childCategories.length > 0 ? (
        <div className="divide-y divide-border border-t border-border">
          {childCategories.map((child) => (
            <CategoryLink category={child} key={child.id} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function CategoryLink({ category, isRoot = false }: { category: CategoryRow; isRoot?: boolean }) {
  return (
    <Link
      href={`/categories/${category.id}`}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
        !isRoot && "pl-8",
      )}
    >
      <div className="min-w-0">
        <p className={cn("truncate font-medium", !isRoot && "text-sm")}>{category.name}</p>
        <p className="text-xs text-muted-foreground">使用 {category.usageCount} 次</p>
      </div>
      <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function groupCategories(categories: CategoryRow[]) {
  const ids = new Set(categories.map((category) => category.id));
  const childrenByParent = new Map<string, CategoryRow[]>();
  const roots: CategoryRow[] = [];

  for (const category of categories) {
    if (category.parentId && ids.has(category.parentId)) {
      const children = childrenByParent.get(category.parentId) ?? [];
      children.push(category);
      childrenByParent.set(category.parentId, children);
    } else {
      roots.push(category);
    }
  }

  return { roots, childrenByParent };
}
