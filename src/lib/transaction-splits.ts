import { parseMoneyToMinor, type Currency } from "@/domain/finance";

/**
 * 一条拆分行：把总金额的一部分归到不同分类。
 * categoryId 必须有值；amount 是用户原文（"1,280"），会在解析时转成 minor。
 */
export type SplitEntry = {
  categoryId: string;
  amount: string;
};

export type ParsedSplit = {
  categoryId: string;
  amountMinor: number;
};

export type SplitValidationOk = {
  ok: true;
  splits: ParsedSplit[];
  /** 总金额 - Σ(拆分)。可能是 0（用户用拆分填满了总额）。负值不应该出现（被 validate 拦截）。 */
  mainAmountMinor: number;
};

export type SplitValidationErr = {
  ok: false;
  error: string;
  /** 出错的拆分行下标（用于前端高亮）。-1 表示整体错误。 */
  index: number;
};

export type SplitValidationResult = SplitValidationOk | SplitValidationErr;

/** 表单里传过来的 JSON 字符串（或 null/undefined）。返回数组，永远不抛。 */
export function parseSplitsJson(raw: string | null | undefined): SplitEntry[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const result: SplitEntry[] = [];
  for (const item of parsed) {
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      const categoryId = typeof record.categoryId === "string" ? record.categoryId.trim() : "";
      const amount = typeof record.amount === "string" ? record.amount.trim() : "";
      if (categoryId && amount) {
        result.push({ categoryId, amount });
      }
    }
  }
  return result;
}

/**
 * 把拆分行解析成 minor 单位 + 校验：
 *   - 每行金额必须是有效正数
 *   - 拆分间分类不能重复（避免两条同分类，应该合并）
 *   - Σ(拆分) <= totalMinor
 *   - 主分类拿到的剩余 = totalMinor - Σ
 */
export function validateSplits(
  splits: SplitEntry[],
  totalMinor: number,
  currency: Currency,
  mainCategoryId: string | undefined,
): SplitValidationResult {
  const parsed: ParsedSplit[] = [];
  const seenCategoryIds = new Set<string>();

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];
    if (!split.categoryId) {
      return { ok: false, error: `第 ${i + 1} 行未选择分类`, index: i };
    }
    if (split.categoryId === mainCategoryId) {
      return {
        ok: false,
        error: `第 ${i + 1} 行的分类与主分类相同，请直接调整总金额`,
        index: i,
      };
    }
    if (seenCategoryIds.has(split.categoryId)) {
      return {
        ok: false,
        error: `第 ${i + 1} 行的分类在前面已经出现过，请合并`,
        index: i,
      };
    }
    seenCategoryIds.add(split.categoryId);

    let amountMinor: number;
    try {
      amountMinor = parseMoneyToMinor(split.amount, currency);
    } catch (error) {
      return {
        ok: false,
        error: `第 ${i + 1} 行金额格式不正确：${error instanceof Error ? error.message : String(error)}`,
        index: i,
      };
    }
    if (amountMinor <= 0) {
      return { ok: false, error: `第 ${i + 1} 行金额必须大于 0`, index: i };
    }
    parsed.push({ categoryId: split.categoryId, amountMinor });
  }

  const splitSum = parsed.reduce((s, p) => s + p.amountMinor, 0);
  if (splitSum > totalMinor) {
    return {
      ok: false,
      error: "拆分金额合计超过了总金额",
      index: -1,
    };
  }

  return { ok: true, splits: parsed, mainAmountMinor: totalMinor - splitSum };
}
