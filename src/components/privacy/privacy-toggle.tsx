"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrivacyMode } from "./privacy-provider";

export function PrivacyToggle() {
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
  const Icon = privacyMode ? EyeOffIcon : EyeIcon;

  return (
    <button
      type="button"
      onClick={togglePrivacyMode}
      aria-pressed={privacyMode}
      aria-label={privacyMode ? "关闭隐私模式" : "开启隐私模式"}
      title={privacyMode ? "关闭隐私模式" : "开启隐私模式"}
      className={cn(
        "fixed right-4 z-50 flex size-11 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg shadow-black/10 backdrop-blur transition-colors",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] hover:bg-muted",
        "min-[820px]:bottom-4",
        privacyMode && "bg-muted text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
