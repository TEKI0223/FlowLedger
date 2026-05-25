"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { updateCnyJpyExchangeRate } from "@/features/exchange-rates/service";
import { revalidatePaths } from "@/lib/revalidate";

const exchangeRateSchema = z.object({
  cnyToJpy: z.coerce
    .number({
      invalid_type_error: "请输入有效汇率",
    })
    .positive("汇率必须大于 0")
    .finite("请输入有效汇率"),
});

export type ExchangeRateActionState = {
  error?: string;
  values?: {
    cnyToJpy?: string;
  };
};

export async function updateExchangeRates(
  _prev: ExchangeRateActionState,
  formData: FormData,
): Promise<ExchangeRateActionState> {
  const values = {
    cnyToJpy: String(formData.get("cnyToJpy") ?? "").trim(),
  };

  const result = exchangeRateSchema.safeParse(values);
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? "汇率内容不完整", values };
  }

  await updateCnyJpyExchangeRate({ cnyToJpy: result.data.cnyToJpy });
  revalidatePaths(["/", "/manage/rates"]);
  redirect("/manage/rates?saved=1");
}
