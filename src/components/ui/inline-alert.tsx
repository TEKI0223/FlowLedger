import type { ReactNode } from "react";

type InlineAlertProps = {
  children: ReactNode;
  tone?: "success" | "danger";
};

export function InlineAlert({ children, tone = "success" }: InlineAlertProps) {
  return <p className={`inline-alert ${tone}`}>{children}</p>;
}
