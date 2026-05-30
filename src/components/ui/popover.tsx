"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "@/lib/utils";

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: Omit<PopoverPrimitive.Popup.Props, "align"> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <PopoverPrimitive.Portal>
      {/* z-index 必须放在 Positioner 上，且高于 Dialog 的 z-50。
          否则在 Dialog 内部触发 Popover 时会被压到 Dialog 下面。 */}
      <PopoverPrimitive.Positioner
        sideOffset={sideOffset}
        align={align}
        className="z-[60]"
      >
        <PopoverPrimitive.Popup
          className={cn(
            "rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-lg outline-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            "transition-all duration-150",
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent };
