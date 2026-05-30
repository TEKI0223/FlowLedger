import { todayIsoDate } from "@/lib/dates";
import type { OcrExtractInput, OcrProvider, ReceiptData } from "../types";

export class MockOcrProvider implements OcrProvider {
  readonly id = "mock";

  async extractReceipt(input: OcrExtractInput): Promise<ReceiptData> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const coffee = input.categories.find((c) => /咖啡|coffee/i.test(c.label));
    const dining = input.categories.find((c) => /外食|餐|dining/i.test(c.label));
    const fallback = input.categories[0];
    const category = coffee ?? dining ?? fallback ?? null;

    return {
      amount: "680",
      currency: "JPY",
      occurredOn: todayIsoDate(),
      categoryId: category?.id ?? null,
      note: "ローソン カフェラテ",
    };
  }
}
