"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { listCategoryOptions } from "@/features/categories/data";
import { getUserPreference, setUserPreference } from "@/features/user-preferences/data";
import {
  OcrError,
  isOcrProviderId,
  ocrProviderRegistry,
  resolveOcrProvider,
  type OcrProviderId,
  type ReceiptData,
} from "@/lib/ocr";

const OCR_PROVIDER_PREF_KEY = "ocr_provider";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_BASE64_LENGTH = Math.ceil((5 * 1024 * 1024 * 4) / 3); // ~5MB raw

export type ExtractReceiptResult =
  | { ok: true; data: ReceiptData; providerId: OcrProviderId; warning: string | null }
  | { ok: false; error: string };

export async function extractReceiptFromImage(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractReceiptResult> {
  try {
    const userId = await getCurrentUserId();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return { ok: false, error: "图片数据缺失" };
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return { ok: false, error: "图片过大，请使用压缩后的图片（建议 <5MB）" };
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return { ok: false, error: `不支持的图片格式：${mimeType}` };
    }

    const preferred = await getUserPreference(userId, OCR_PROVIDER_PREF_KEY);
    const { provider, id: providerId, fallbackReason } = resolveOcrProvider(preferred);

    const categories = await listCategoryOptions();
    const data = await provider.extractReceipt({
      imageBase64,
      mimeType,
      categories: categories.map((c) => ({ id: c.id, label: c.label })),
    });

    return { ok: true, data, providerId, warning: fallbackReason };
  } catch (error) {
    if (error instanceof OcrError) {
      return { ok: false, error: `识别失败（${error.code}）：${error.message}` };
    }
    if (error instanceof Error && error.message === "Not authenticated.") {
      return { ok: false, error: "请先登录" };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

export type SetOcrProviderResult =
  | { ok: true; providerId: OcrProviderId }
  | { ok: false; error: string };

export async function setOcrProvider(providerId: string): Promise<SetOcrProviderResult> {
  const userId = await getCurrentUserId();
  if (!isOcrProviderId(providerId)) {
    return { ok: false, error: `未知的 provider：${providerId}` };
  }
  const meta = ocrProviderRegistry[providerId];
  if (meta.envVar && !process.env[meta.envVar]) {
    return {
      ok: false,
      error: `${meta.label} 需要配置环境变量 ${meta.envVar}`,
    };
  }
  await setUserPreference(userId, OCR_PROVIDER_PREF_KEY, providerId);
  revalidatePath("/manage/ocr");
  return { ok: true, providerId };
}

export async function getCurrentOcrProviderId(): Promise<OcrProviderId> {
  const userId = await getCurrentUserId();
  const preferred = await getUserPreference(userId, OCR_PROVIDER_PREF_KEY);
  const { id } = resolveOcrProvider(preferred);
  return id;
}
