"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

/**
 * 嵌套 dialog 模糊维护：单例 MutationObserver 跟踪所有 dialog 的 data-open，
 * 给非栈顶的（DOM 顺序非最后一个 open）加上 .dialog-stacked class。
 * 见 globals.css 里的样式。
 *
 * 用 MutationObserver 而不是 React state 的原因：base-ui 关闭 dialog 时会先
 * 把 data-open 切成 data-closed，再播放退出动画然后卸载。监听 attribute
 * 变化能在 data-open 一变就同步状态，避免"动画期间底层仍模糊"的延迟。
 */
let dialogStackObserverInstalled = false;
function ensureDialogStackObserver() {
  if (dialogStackObserverInstalled || typeof document === "undefined") return;
  dialogStackObserverInstalled = true;

  const recompute = () => {
    const dialogs = Array.from(
      document.querySelectorAll<HTMLElement>('[data-slot="dialog-content"]'),
    );
    const open = dialogs.filter((d) => d.hasAttribute("data-open"));
    dialogs.forEach((d) => d.classList.remove("dialog-stacked"));
    // DOM 顺序最后一个是栈顶；之前的全部标 stacked
    for (let i = 0; i < open.length - 1; i++) {
      open[i].classList.add("dialog-stacked");
    }
  };

  const observer = new MutationObserver(recompute);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-open", "data-closed"],
    subtree: true,
    childList: true,
  });
  // 初始扫一遍（覆盖 SSR 已挂载的场景）
  recompute();
}

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  style,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  // 跟随 visualViewport：iOS 键盘弹出时把 dialog 中心钉到可视区域中央，
  // 同时把 max-height 限制为可视区域高度，避免内容被键盘遮挡。
  const vv = useVisualViewport();
  const vvStyle: React.CSSProperties | undefined = vv
    ? {
        top: `${vv.offsetTop + vv.height / 2}px`,
        maxHeight: `${vv.height - 24}px`,
      }
    : undefined;

  // 首次挂载时确保全局 dialog 栈 observer 已启动
  React.useEffect(() => {
    ensureDialogStackObserver();
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        style={{ ...vvStyle, ...style }}
        className={cn(
          "fixed left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-auto rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // 当 visualViewport 不可用（fallback）时仍居中显示
          !vv && "top-1/2",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
