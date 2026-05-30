"use client";

import { useActionState } from "react";
import { setOcrProvider, type SetOcrProviderResult } from "@/app/actions/ocr";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import type { OcrProviderId, OcrProviderMeta } from "@/lib/ocr";

type ProviderRow = OcrProviderMeta & { keyConfigured: boolean };

type Props = {
  currentProviderId: OcrProviderId;
  providers: ProviderRow[];
};

type State = SetOcrProviderResult | null;

async function action(_prev: State, formData: FormData): Promise<State> {
  const id = String(formData.get("providerId") ?? "");
  return setOcrProvider(id);
}

export function OcrSettingsForm({ currentProviderId, providers }: Props) {
  const [state, formAction] = useActionState<State, FormData>(action, null);

  return (
    <form action={formAction} className="grid gap-4">
      {state?.ok ? <InlineAlert>已切换到该 provider</InlineAlert> : null}
      {state && !state.ok ? <InlineAlert tone="danger">{state.error}</InlineAlert> : null}

      <ul className="grid gap-2">
        {providers.map((p) => {
          const disabled = !p.keyConfigured;
          const isActive = p.id === currentProviderId;
          return (
            <li key={p.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3 transition-colors",
                  disabled && "cursor-not-allowed opacity-60",
                  isActive && "border-primary/60 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name="providerId"
                  value={p.id}
                  defaultChecked={isActive}
                  disabled={disabled}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{p.label}</span>
                    {p.model ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {p.model}
                      </span>
                    ) : null}
                    {p.envVar ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px]",
                          p.keyConfigured
                            ? "bg-income/10 text-income"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {p.envVar} {p.keyConfigured ? "✓" : "未配置"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <SubmitButton>保存</SubmitButton>
    </form>
  );
}
