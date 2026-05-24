import Link from "next/link";
import { ArrowRightIcon, FolderTreeIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIconLabel } from "@/features/categories/category-icon-label";
import { listCategories, type CategoryRow } from "@/features/categories/data";
import {
  buildResolvedCategoryIconKeyMap,
  type CategoryIconKey,
} from "@/features/categories/icon-utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  const { roots, childrenByParent } = groupCategories(categories);
  const iconKeyById = buildResolvedCategoryIconKeyMap(categories);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:pt-6">
      <header className="flex items-start justify-between gap-3 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">交易分类</h1>
        </div>
        <Link href="/categories/new" className={cn(buttonVariants({ size: "sm" }), "h-8 shrink-0")}>
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
              childrenByParent={childrenByParent}
              iconKeyById={iconKeyById}
            />
          ))}
        </div>
      )}
    </main>
  );
}

function CategoryGroup({
  category,
  childrenByParent,
  iconKeyById,
}: {
  category: CategoryRow;
  childrenByParent: Map<string, CategoryRow[]>;
  iconKeyById: Map<string, CategoryIconKey>;
}) {
  return (
    <Card size="sm" className="py-0">
      <div className="divide-y divide-border">
        <CategoryTreeRows
          category={category}
          childrenByParent={childrenByParent}
          iconKeyById={iconKeyById}
          level={0}
          visited={new Set()}
        />
      </div>
    </Card>
  );
}

function CategoryTreeRows({
  category,
  childrenByParent,
  iconKeyById,
  level,
  visited,
}: {
  category: CategoryRow;
  childrenByParent: Map<string, CategoryRow[]>;
  iconKeyById: Map<string, CategoryIconKey>;
  level: number;
  visited: Set<string>;
}) {
  if (visited.has(category.id)) return null;

  const nextVisited = new Set(visited);
  nextVisited.add(category.id);
  const childCategories = childrenByParent.get(category.id) ?? [];

  return (
    <>
      <CategoryLink
        category={category}
        childCount={childCategories.length}
        iconKey={iconKeyById.get(category.id)}
        level={level}
      />
      {childCategories.map((child) => (
        <CategoryTreeRows
          key={child.id}
          category={child}
          childrenByParent={childrenByParent}
          iconKeyById={iconKeyById}
          level={level + 1}
          visited={nextVisited}
        />
      ))}
    </>
  );
}

function CategoryLink({
  category,
  childCount,
  iconKey,
  level,
}: {
  category: CategoryRow;
  childCount: number;
  iconKey?: CategoryIconKey;
  level: number;
}) {
  const visibleLevel = Math.min(level, 5);

  return (
    <Link
      href={`/categories/${category.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
      style={{ paddingLeft: `${1 + visibleLevel * 1.125}rem` }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {level > 0 ? (
          <span
            aria-hidden="true"
            className="h-8 w-px shrink-0 bg-border"
            style={{ marginLeft: `${Math.max(0, visibleLevel - 1) * 0.125}rem` }}
          />
        ) : null}
        <div className="min-w-0">
          <CategoryIconLabel
            iconKey={iconKey}
            name={category.name}
            labelClassName={cn("font-medium", level > 0 && "text-sm")}
          />
          <p className="truncate text-xs text-muted-foreground">
            使用 {category.usageCount} 次{childCount > 0 ? ` · ${childCount} 个子类` : ""}
          </p>
        </div>
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
