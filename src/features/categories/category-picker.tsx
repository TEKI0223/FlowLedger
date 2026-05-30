"use client";

import { useMemo, useState } from "react";
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  /** 表单 name；省略则不渲染 hidden input。 */
  name?: string;
  categories: CategoryPickerOption[];
  defaultValue?: string;
  /** 受控值。提供则忽略内部状态。 */
  value?: string;
  /** 受控变更回调。 */
  onChange?: (categoryId: string) => void;
  emptyLabel?: string;
  /** 挂载时立即打开对话框。 */
  defaultOpen?: boolean;
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
  defaultOpen = false,
}: CategoryPickerProps) {
  const isControlled = value !== undefined;
  const [internalSelectedId, setInternalSelectedId] = useState(defaultValue);
  const selectedId = isControlled ? value : internalSelectedId;
  const setSelectedId = (next: string) => {
    if (!isControlled) setInternalSelectedId(next);
    onChange?.(next);
  };

  const [open, setOpen] = useState(defaultOpen);
  const rootGroups = useMemo(() => groupByRoot(categories), [categories]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedId),
    [categories, selectedId],
  );

  // drilldown：当前展开的根分类（null = 显示根 grid）
  const [drilledRootId, setDrilledRootId] = useState<string | null>(null);
  const drilledGroup = drilledRootId
    ? (rootGroups.find((group) => group.root.id === drilledRootId) ?? null)
    : null;

  // 打开时：选中了某子类则自动 drill 到其父类。渲染阶段比较（避免 useEffect cascading）。
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      let next: string | null = null;
      if (selectedCategory) {
        const rootName = selectedCategory.label.split("/")[0];
        const group = rootGroups.find((g) => g.root.label === rootName);
        if (group && group.children.length > 0 && group.root.id !== selectedCategory.id) {
          next = group.root.id;
        }
      }
      setDrilledRootId(next);
    }
  }

  function selectAndClose(categoryId: string) {
    setSelectedId(categoryId);
    setOpen(false);
  }

  function handleRootTileClick(group: RootGroup) {
    if (group.children.length === 0) {
      selectAndClose(group.root.id);
    } else {
      setDrilledRootId(group.root.id);
    }
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-3 py-3">
            {drilledGroup ? (
              <button
                type="button"
                onClick={() => setDrilledRootId(null)}
                className="-mx-1 flex items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-muted/60"
              >
                <ArrowLeftIcon className="size-4 text-muted-foreground" />
                <DialogTitle className="text-base">{drilledGroup.root.label}</DialogTitle>
              </button>
            ) : (
              <DialogTitle className="text-base">选择分类</DialogTitle>
            )}
            <DialogDescription className="sr-only">
              {drilledGroup ? `查看 ${drilledGroup.root.label} 的子分类` : "选择一个分类"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-auto p-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {drilledGroup ? (
                <>
                  <CategoryTile
                    label={drilledGroup.root.label}
                    iconKey={drilledGroup.root.iconKey}
                    selected={selectedId === drilledGroup.root.id}
                    onClick={() => selectAndClose(drilledGroup.root.id)}
                  />
                  {drilledGroup.children.map((child) => (
                    <CategoryTile
                      key={child.id}
                      label={stripParentPrefix(child.label, drilledGroup.root.label)}
                      iconKey={child.iconKey}
                      selected={selectedId === child.id}
                      onClick={() => selectAndClose(child.id)}
                    />
                  ))}
                </>
              ) : (
                rootGroups.map((group) => {
                  const hasChildren = group.children.length > 0;
                  const isSelected =
                    selectedId === group.root.id ||
                    (hasChildren && group.children.some((c) => c.id === selectedId));
                  return (
                    <CategoryTile
                      key={group.root.id}
                      label={group.root.label}
                      iconKey={group.root.iconKey}
                      selected={isSelected}
                      hasChildren={hasChildren}
                      onClick={() => handleRootTileClick(group)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryTile({
  label,
  iconKey,
  selected,
  hasChildren,
  onClick,
}: {
  label: string;
  iconKey: CategoryIconKey;
  selected: boolean;
  hasChildren?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-center text-xs font-medium transition-colors",
        selected
          ? "border-foreground/30 bg-muted text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {hasChildren ? (
        <ChevronRightIcon className="absolute right-1.5 top-1.5 size-3 text-muted-foreground/60" />
      ) : null}
      <CategoryIcon iconKey={iconKey} className="size-7" />
      <span className="line-clamp-2 leading-tight">{label}</span>
    </button>
  );
}

function stripParentPrefix(label: string, rootLabel: string): string {
  return label.startsWith(`${rootLabel}/`) ? label.slice(rootLabel.length + 1) : label;
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
