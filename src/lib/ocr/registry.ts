export type OcrProviderId = "mock" | "gemini" | "openai";

export type OcrProviderMeta = {
  id: OcrProviderId;
  label: string;
  description: string;
  envVar: string | null;
  model: string | null;
};

export const ocrProviderRegistry: Record<OcrProviderId, OcrProviderMeta> = {
  mock: {
    id: "mock",
    label: "Mock（开发用）",
    description: "返回固定假数据，用于在没有 API key 的情况下调通链路。",
    envVar: null,
    model: null,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    description: "Gemini 2.0 Flash，日语小票识别强、价格低。",
    envVar: "GOOGLE_AI_API_KEY",
    model: "gemini-2.0-flash",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    description: "GPT-4o mini，多模态稳定，可通过 OPENAI_MODEL 切换更强的模型。",
    envVar: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
  },
};

export const ocrProviderIds = Object.keys(ocrProviderRegistry) as OcrProviderId[];

export function isOcrProviderId(value: string): value is OcrProviderId {
  return value in ocrProviderRegistry;
}

export function isProviderKeyConfigured(meta: OcrProviderMeta): boolean {
  if (!meta.envVar) return true;
  return Boolean(process.env[meta.envVar]);
}
