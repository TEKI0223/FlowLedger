"use client";

import { type FormEvent, type ReactNode, useId, useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FilterDialogProps = {
  title: string;
  description?: string;
  activeCount?: number;
  children: ReactNode;
};

export function FilterDialog({ title, description, activeCount = 0, children }: FilterDialogProps) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const pathname = usePathname();
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed) params.set(key, trimmed);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setOpen(false);
  }

  function clearFilters() {
    router.push(pathname);
    setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant={activeCount > 0 ? "default" : "outline"}
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontalIcon />
        筛选
        {activeCount > 0 ? <span className="tabular-nums">({activeCount})</span> : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <form id={formId} onSubmit={handleSubmit} className="grid gap-4">
            {children}
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearFilters}>
              清除
            </Button>
            <Button type="submit" form={formId}>
              应用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
