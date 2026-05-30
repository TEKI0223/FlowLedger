import { GoogleGenAI, Type } from "@google/genai";
import { receiptDataSchema } from "../schema";
import { OcrError, type OcrExtractInput, type OcrProvider, type ReceiptData } from "../types";

const DEFAULT_MODEL = "gemini-2.0-flash";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    amount: {
      type: Type.STRING,
      nullable: true,
      description:
        "合計金額の数字のみ。例：'1,280' や '680'。通貨記号やカンマ以外の文字は含めない。読み取れない場合は null。",
    },
    currency: {
      type: Type.STRING,
      nullable: true,
      enum: ["JPY", "CNY"],
      description: "通貨。円・¥なら JPY、元・￥（中国の文脈）なら CNY。判断できなければ null。",
    },
    occurredOn: {
      type: Type.STRING,
      nullable: true,
      description:
        "YYYY-MM-DD 形式の日付。令和は西暦に換算（令和=2018+年）。読み取れない場合は null。",
    },
    categoryId: {
      type: Type.STRING,
      nullable: true,
      description:
        "提供されたカテゴリ一覧から最も近い id をひとつ選ぶ。確信が持てなければ親カテゴリの id、それも難しければ null。一覧にない値は絶対に返さない。",
    },
    note: {
      type: Type.STRING,
      nullable: true,
      description:
        "店名と主要な商品を1-2語でまとめる。例：'ローソン カフェラテ'、'セブン-イレブン お弁当'。最大200文字。",
    },
  },
  required: ["amount", "currency", "occurredOn", "categoryId", "note"],
  propertyOrdering: ["amount", "currency", "occurredOn", "categoryId", "note"],
};

export class GeminiOcrProvider implements OcrProvider {
  readonly id = "gemini";
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new OcrError(
        "provider_unavailable",
        "GOOGLE_AI_API_KEY is not configured for GeminiOcrProvider.",
      );
    }
    this.client = new GoogleGenAI({ apiKey });
    this.model = options?.model ?? DEFAULT_MODEL;
  }

  async extractReceipt(input: OcrExtractInput): Promise<ReceiptData> {
    const prompt = buildPrompt(input.categories);

    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
          // 输出极短（~100 tokens 的 JSON），1024 留余量但防失控
          maxOutputTokens: 1024,
          // 2.5 系列模型默认开 thinking，对结构化抽取没好处只增成本。
          // 显式关掉，即使将来换 thinking 模型也安全。
          // 2.0-flash 不支持 thinking，传 0 也是 no-op。
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch (error) {
      throw new OcrError(
        "upstream_error",
        `Gemini request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const text = response.text;
    if (!text) {
      throw new OcrError("parse_failed", "Gemini returned an empty response.");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new OcrError("parse_failed", `Gemini returned non-JSON: ${text.slice(0, 200)}`);
    }

    const parsed = receiptDataSchema.safeParse(raw);
    if (!parsed.success) {
      throw new OcrError(
        "parse_failed",
        `Gemini response did not match schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      );
    }

    const validCategoryIds = new Set(input.categories.map((c) => c.id));
    const categoryId =
      parsed.data.categoryId && validCategoryIds.has(parsed.data.categoryId)
        ? parsed.data.categoryId
        : null;

    return {
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      occurredOn: parsed.data.occurredOn,
      categoryId,
      note: parsed.data.note,
    };
  }
}

function buildPrompt(categories: OcrExtractInput["categories"]): string {
  const categoryList = categories.map((c) => `- ${c.id} | ${c.label}`).join("\n");

  return [
    "あなたは家計簿アプリのアシスタントです。レシート画像から構造化データを抽出します。",
    "",
    "ルール：",
    "1. 合計金額（税込）を amount に。小計ではなく合計を優先。",
    "2. 通貨は JPY か CNY。日本のレシート（¥・円）は JPY。",
    "3. 日付は YYYY-MM-DD。令和は西暦に換算（令和N年 = 2018+N年）。",
    "4. 店名と主要商品を note に1-2語で。",
    "5. カテゴリは下記一覧から最も近い id を選ぶ。一覧にない値は絶対に出力しない。確信が持てなければ親カテゴリ、それも難しければ null。",
    "6. 読み取れない項目は null。推測で埋めない。",
    "",
    "利用可能なカテゴリ一覧（id | パス）：",
    categoryList,
  ].join("\n");
}
