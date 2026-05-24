export const categoryIconKeys = [
  "housing",
  "grocery",
  "dining",
  "coffee",
  "daily-goods",
  "beauty",
  "electronics",
  "clothing",
  "transport",
  "game",
  "subscription",
  "medical",
  "entertainment",
  "travel",
  "gift",
  "fees-tax",
  "income",
  "refund",
  "other",
] as const;

export type CategoryIconKey = (typeof categoryIconKeys)[number];

export const defaultCategoryIconKey: CategoryIconKey = "other";

const categoryIconKeySet = new Set<string>(categoryIconKeys);

export type CategoryIconSource = {
  id: string;
  parentId: string | null;
  iconKey: string | null;
};

export function normalizeCategoryIconKey(iconKey: string | null | undefined): CategoryIconKey {
  if (iconKey && categoryIconKeySet.has(iconKey)) {
    return iconKey as CategoryIconKey;
  }

  return defaultCategoryIconKey;
}

export function resolveCategoryIconKey(
  category: CategoryIconSource | null | undefined,
  categoryById: Map<string, CategoryIconSource>,
): CategoryIconKey {
  let current = category;
  const visited = new Set<string>();

  while (current) {
    if (current.iconKey) {
      return normalizeCategoryIconKey(current.iconKey);
    }

    if (!current.parentId || visited.has(current.id)) {
      break;
    }

    visited.add(current.id);
    current = categoryById.get(current.parentId);
  }

  return defaultCategoryIconKey;
}

export function buildResolvedCategoryIconKeyMap(
  categories: CategoryIconSource[],
): Map<string, CategoryIconKey> {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return new Map(
    categories.map((category) => [category.id, resolveCategoryIconKey(category, categoryById)]),
  );
}
