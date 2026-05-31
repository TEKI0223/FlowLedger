"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as SelectPrimitive } from "@base-ui/react/select";

import { cn } from "@/lib/utils";

type OptionEntry = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  hidden?: boolean;
};

function collectOptions(children: React.ReactNode, out: OptionEntry[]) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === React.Fragment) {
      collectOptions((child.props as { children?: React.ReactNode }).children, out);
      return;
    }
    if (child.type === "option") {
      const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement> & {
        children?: React.ReactNode;
      };
      out.push({
        value: String(props.value ?? ""),
        label: props.children,
        disabled: props.disabled,
        hidden: props.hidden,
      });
    }
  });
}

type NativeSelectProps = {
  id?: string;
  name?: string;
  className?: string;
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  form?: string;
  placeholder?: React.ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export function NativeSelect({
  id,
  name,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  required,
  autoComplete,
  placeholder,
  form,
  ...rest
}: NativeSelectProps) {
  const items = React.useMemo(() => {
    const list: OptionEntry[] = [];
    collectOptions(children, list);
    return list;
  }, [children]);

  const visibleItems = items.filter((item) => !item.hidden);
  const labelByValue = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    items.forEach((item) => map.set(item.value, item.label));
    return map;
  }, [items]);

  const isControlled = value !== undefined;

  const handleValueChange = (next: string | null) => {
    if (!onChange) return;
    const nextValue = next ?? "";
    const fakeEvent = {
      target: { name: name ?? "", value: nextValue },
      currentTarget: { name: name ?? "", value: nextValue },
    } as unknown as React.ChangeEvent<HTMLSelectElement>;
    onChange(fakeEvent);
  };

  return (
    <SelectPrimitive.Root
      name={name}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      form={form}
      value={isControlled ? (value ?? null) : undefined}
      defaultValue={isControlled ? undefined : (defaultValue ?? null)}
      onValueChange={handleValueChange}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-slot="native-select"
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent pl-2.5 pr-2 py-1 text-base text-foreground transition-colors outline-none cursor-default",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-[popup-open]:border-ring",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "md:text-sm",
          "dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...rest}
      >
        <SelectPrimitive.Value className="truncate text-left">
          {(current) => {
            const key = current == null ? "" : String(current);
            const label = labelByValue.get(key);
            if (label !== undefined && label !== "" && label !== null) return label;
            if (placeholder) return <span className="text-muted-foreground">{placeholder}</span>;
            return null;
          }}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="flex shrink-0 items-center text-muted-foreground">
          <ChevronDownIcon className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60] outline-none"
        >
          <SelectPrimitive.Popup
            className={cn(
              "max-h-[min(var(--available-height),20rem)] min-w-[var(--anchor-width)] overflow-y-auto",
              "rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
              "transition-all duration-150 origin-[var(--transform-origin)]",
            )}
          >
            <SelectPrimitive.List>
              {visibleItems.map((item) => (
                <SelectPrimitive.Item
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-8 pr-2 text-sm outline-none",
                    "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                  )}
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText className="truncate">
                    {item.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
