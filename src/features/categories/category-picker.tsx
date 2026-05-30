"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CategoryIcon, CategoryIconLabel } from "./category-icon-label";
import type { CategoryIconKey } from "./icon-utils";

export type CategoryPickerOption = {
  id: string;
  label: string;
  level: number;
  iconKey: CategoryIconKey;
};

type CategoryPickerProps = {
  id?: string;
  /** 表单 name；省略则不渲染 hidden input（用于 SplitsField 这类自己序列化的场景）。 */
  name?: string;
  categories: CategoryPickerOption[];
  defaultValue?: string;
  /** 受控值。提供则忽略内部状态。 */
  value?: string;
  /** 受控变更回调。 */
  onChange?: (categoryId: string) => void;
  emptyLabel?: string;
};

type RootGroup = {
  root: CategoryPickerOption;
  children: CategoryPickerOption[];
};

export function CategoryPicker({
  id = "categoryId",
  name,
  categories,
  defaultValue = "",
  value,
  onChange,
  emptyLabel = "无分类",
}: CategoryPickerProps) {
  const isControlled = value !== undefined;
  const [internalSelectedId, setInternalSelectedId] = useState(defaultValue);
  const selectedId = isControlled ? value : internalSelectedId;
  const setSelectedId = (next: string) => {
    if (!isControlled) setInternalSelectedId(next);
    onChange?.(next);
  };
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeRootLabel, setActiveRootLabel] = useState<string | undefined>();

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId),
    [categories, selectedId],
  );
  const rootGroups = useMemo(() => groupByRoot(categories), [categories]);
  const activeRootName =
    activeRootLabel ?? selectedCategory?.label.split("/")[0] ?? rootGroups[0]?.root.label;
  const activeGroup =
    rootGroups.find((group) => group.root.label === activeRootName) ?? rootGroups[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchResults = normalizedQuery
    ? categories.filter((category) => category.label.toLocaleLowerCase().includes(normalizedQuery))
    : [];

  function selectCategory(categoryId: string) {
    setSelectedId(categoryId);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="grid gap-2">
      {name ? <input id={id} name={name} type="hidden" value={selectedId} /> : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          {selectedCategory ? (
            <CategoryIconLabel
              iconKey={selectedCategory.iconKey}
              name={selectedCategory.label}
              className="min-w-0"
              labelClassName="text-sm font-medium"
            />
          ) : (
            <span className="text-sm text-muted-foreground">{emptyLabel}</span>
          )}
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>

        {selectedId ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="清除分类"
            onClick={() => setSelectedId("")}
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            setActiveRootLabel(selectedCategory?.label.split("/")[0] ?? rootGroups[0]?.root.label);
          }
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>选择分类</DialogTitle>
            <DialogDescription>先选一级分类，也可以直接搜索。</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索分类"
                className="h-10 pl-9 text-sm"
                autoFocus
              />
            </div>

            {normalizedQuery ? (
              <div className="grid max-h-[55dvh] gap-1 overflow-auto rounded-lg border border-border p-1">
                {searchResults.length > 0 ? (
                  searchResults.map((category) => (
                    <CategoryOptionButton
                      key={category.id}
                      category={category}
                      selected={category.id === selectedId}
                      onSelect={() => selectCategory(category.id)}
                    />
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">没有匹配的分类</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {rootGroups.map((group) => (
                    <button
                      type="button"
                      key={group.root.id}
                      onClick={() => setActiveRootLabel(group.root.label)}
                      className={cn(
                        "flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border px-2 py-2 text-center text-xs font-medium transition-colors",
                        group.root.label === activeGroup?.root.label
                          ? "border-foreground/30 bg-muted text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <CategoryIcon iconKey={group.root.iconKey} className="size-8" />
                      <span className="line-clamp-2">{group.root.label}</span>
                    </button>
                  ))}
                </div>

                {activeGroup ? (
                  <div className="grid max-h-[38dvh] gap-1 overflow-auto rounded-lg border border-border p-1">
                    {[activeGroup.root, ...activeGroup.children].map((category) => (
                      <CategoryOptionButton
                        key={category.id}
                        category={category}
                        selected={category.id === selectedId}
                        onSelect={() => selectCategory(category.id)}
                        rootLabel={activeGroup.root.label}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryOptionButton({
  category,
  selected,
  onSelect,
  rootLabel,
}: {
  category: CategoryPickerOption;
  selected: boolean;
  onSelect: () => void;
  rootLabel?: string;
}) {
  const displayName =
    rootLabel && category.label.startsWith(`${rootLabel}/`)
      ? category.label.slice(rootLabel.length + 1)
      : category.label;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-10 items-center justify-between gap-3 rounded-md px-2 py-2 text-left transition-colors",
        selected ? "bg-foreground text-background" : "hover:bg-muted",
      )}
    >
      <CategoryIconLabel
        iconKey={category.iconKey}
        name={displayName}
        labelClassName="text-sm font-medium"
      />
      {selected ? <span className="text-xs font-medium">已选</span> : null}
    </button>
  );
}

function groupByRoot(categories: CategoryPickerOption[]): RootGroup[] {
  const roots = categories.filter((category) => category.level === 0);

  return roots.map((root) => ({
    root,
    children: categories.filter(
      (category) => category.id !== root.id && category.label.startsWith(`${root.label}/`),
    ),
  }));
}
