import { revalidatePath } from "next/cache";

/**
 * 按 feature 集中所有缓存失效路径。
 *
 * 加新页面时只改这里，不用满项目搜 `revalidatePath("/foo")`。
 * Stage 2 加 /stats 和 /manage 时直接挂到对应 helper。
 */

export function revalidatePaths(paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export function accountPaths(id?: string) {
  return compactPaths("/", "/accounts", id && `/accounts/${id}`);
}

export function transactionPaths(id?: string) {
  return compactPaths("/", "/accounts", "/transactions", id && `/transactions/${id}`);
}

export function categoryPaths(id?: string) {
  return compactPaths(
    "/",
    "/entry",
    "/categories",
    "/transactions",
    "/templates",
    "/recurring",
    id && `/categories/${id}`,
  );
}

export function recurringPaths(id?: string) {
  return compactPaths("/", "/recurring", "/recurring/pending", id && `/recurring/${id}`);
}

/** 周期项确认时一并触发交易 / 账户 / 周期相关路径。 */
export function recurringConfirmPaths(recurringId?: string) {
  return compactPaths(
    "/",
    "/accounts",
    "/transactions",
    "/recurring",
    "/recurring/pending",
    recurringId && `/recurring/${recurringId}`,
  );
}

export function refundPaths(id?: string, targetAccountId?: string) {
  return compactPaths(
    "/",
    "/refunds",
    "/transactions",
    "/accounts",
    id && `/refunds/${id}`,
    targetAccountId && `/accounts/${targetAccountId}`,
  );
}

export function installmentPaths(id?: string, originalTransactionId?: string) {
  return compactPaths(
    "/",
    "/installments",
    id && `/installments/${id}`,
    originalTransactionId && `/transactions/${originalTransactionId}`,
  );
}

export function templatePaths(id?: string) {
  return compactPaths("/", "/templates", id && `/templates/${id}`);
}

function compactPaths(...paths: Array<string | false | undefined>) {
  return paths.filter((path): path is string => Boolean(path));
}
