import OpenAI from "openai";
import { receiptDataSchema } from "../schema";
import { OcrError, type OcrExtractInput, type OcrProvider, type ReceiptData } from "../types";

const DEFAULT_MODEL = "gpt-4o-mini";

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    amount: {
      type: ["string", "null"],
      description:
        "合計金額の数字のみ。例：'1,280' や '680'。通貨記号やカンマ以外の文字は含めない。読み取れない場合は null。",
    },
    currency: {
      type: ["string", "null"],
      enum: ["JPY", "CNY", null],
      description: "通貨。日本のレシート（¥・円）は JPY、中国の文脈の元（￥/RMB）は CNY。判断できなければ null。",
    },
    occurredOn: {
      type: ["string", "null"],
      description:
        "YYYY-MM-DD 形式の日付。令和は西暦に換算（令和N年 = 2018+N年）。読み取れない場合は null。",
    },
    categoryId: {
      type: ["string", "null"],
      description:
        "提供されたカテゴリ一覧から最も近い id をひとつ選ぶ。確信が持てなければ親カテゴリの id、それも難しければ null。一覧にない値は絶対に出力しない。",
    },
    note: {
      type: ["string", "null"],
      description:
        "店名と主要な商品を1-2語でまとめる。例：'ローソン カフェラテ'、'セブン-イレブン お弁当'。最大200文字。",
    },
  },
  required: ["amount", "currency", "occurredOn", "categoryId", "note"],
} as const;

export class OpenAiOcrProvider implements OcrProvider {
  readonly id = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new OcrError(
        "provider_unavailable",
        "OPENAI_API_KEY is not configured for OpenAiOcrProvider.",
      );
    }
    this.client = new OpenAI({ apiKey });
    this.model = options?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

    // 推理模型（o1/o3/o4 系列）会产生大量隐藏 reasoning tokens，单次成本可能高几十倍，
    // 对结构化抽取没有意义。显式拒绝，避免误配置。
    if (/^o\d/i.test(this.model)) {
      throw new OcrError(
        "provider_unavailable",
        `OpenAI 推理模型（${this.model}）不适合 OCR 结构化抽取（成本高且无收益），请使用 gpt-4o / gpt-4o-mini 等多模态模型。`,
      );
    }
  }

  async extractReceipt(input: OcrExtractInput): Promise<ReceiptData> {
    const prompt = buildPrompt(input.categories);
    const dataUrl = `data:${input.mimeType};base64,${input.imageBase64}`;

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        // 输出极短，封顶防失控
        max_tokens: 1024,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "receipt_extraction",
            strict: true,
            schema: RESPONSE_SCHEMA,
          },
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              // detail: "low" 把图固定为 85 tokens；"high" 会切瓦片到 1500+ tokens。
              // 1280px 压缩后的小票，low 模式准确率仍然不错；想提准时可改 "high"。
              { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
            ],
          },
        ],
      });
    } catch (error) {
      throw new OcrError(
        "upstream_error",
        `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const text = response.choices[0]?.message?.content;
    if (!text) {
      throw new OcrError("parse_failed", "OpenAI returned an empty response.");
    }

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new OcrError("parse_failed", `OpenAI returned non-JSON: ${text.slice(0, 200)}`);
    }

    const parsed = receiptDataSchema.safeParse(raw);
    if (!parsed.success) {
      throw new OcrError(
        "parse_failed",
        `OpenAI response did not match schema: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
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
