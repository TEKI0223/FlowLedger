"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCategory, wouldCreateCategoryCycle } from "@/features/categories/data";
import {
  createCategoryRecord,
  deleteCategoryRecord,
  updateCategoryRecord,
} from "@/features/categories/service";
import { normalize, stringField } from "@/lib/form";
import { categoryPaths, revalidatePaths } from "@/lib/revalidate";

const categorySchema = z.object({
  name: z.string().trim().min(1, "请输入分类名称"),
  parentId: z.string().trim().optional(),
});

export type CategoryFormValues = {
  name?: string;
  parentId?: string;
};

export type CategoryActionState = {
  error?: string;
  values?: CategoryFormValues;
};

function extractValues(formData: FormData): CategoryFormValues {
  return {
    name: stringField(formData, "name"),
    parentId: stringField(formData, "parentId"),
  };
}

export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const values = extractValues(formData);
  const result = categorySchema.safeParse({
    name: values.name,
    parentId: normalize(values.parentId),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "分类内容不完整", values };
  }

  const id = await createCategoryRecord(result.data);
  revalidatePaths(categoryPaths(id));
  redirect("/categories");
}

export async function updateCategory(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const values = extractValues(formData);
  const result = categorySchema.safeParse({
    name: values.name,
    parentId: normalize(values.parentId),
  });

  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "分类内容不完整", values };
  }

  if (await wouldCreateCategoryCycle(id, result.data.parentId)) {
    return { error: "不能把分类移动到自己或自己的子分类下面", values };
  }

  await updateCategoryRecord(id, result.data);
  revalidatePaths(categoryPaths(id));
  redirect("/categories");
}

export async function deleteCategory(id: string) {
  const category = await getCategory(id);
  if (!category) redirect("/categories");

  const result = await deleteCategoryRecord(id);
  revalidatePaths(categoryPaths(id));

  if (!result.ok) {
    redirect(`/categories/${id}?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/categories");
}
