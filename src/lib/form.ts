import { parseMoneyToMinor, type Currency } from "@/domain/finance";

/** 从 FormData 拿一个字符串字段，非字符串返回 undefined。 */
export function stringField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

/** 把字符串 trim；空字符串归一为 undefined。 */
export function normalize(value: string | undefined): string | undefined {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** 直接从 FormData 拿一个 normalize 之后的字段。 */
export function normalizedField(formData: FormData, key: string): string | undefined {
  return normalize(stringField(formData, key));
}

export type ParsedAmount =
  | { ok: true; amountMinor: number }
  | { ok: false; error: string };

/**
 * 解析金额字符串到 minor units，统一错误形态。
 *
 * - 空 / 空白：返回 `请输入金额` 错误
 * - 非法格式 / 精度超限：透传 parseMoneyToMinor 的错误消息
 * - 返回**有符号**金额（负数保留）。需要正值的调用方自己 `Math.abs(amountMinor)`
 */
export function parseAmount(
  raw: string | undefined,
  currency: Currency,
): ParsedAmount {
  if (!raw || raw.trim().length === 0) {
    return { ok: false, error: "请输入金额" };
  }
  try {
    return { ok: true, amountMinor: parseMoneyToMinor(raw, currency) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "金额格式不正确",
    };
  }
}
