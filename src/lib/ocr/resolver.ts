import type { OcrProvider } from "./types";
import {
  isOcrProviderId,
  isProviderKeyConfigured,
  ocrProviderRegistry,
  type OcrProviderId,
} from "./registry";
import { MockOcrProvider } from "./providers/mock";
import { GeminiOcrProvider } from "./providers/gemini";
import { OpenAiOcrProvider } from "./providers/openai";

export type ResolvedProvider = {
  provider: OcrProvider;
  id: OcrProviderId;
  fallbackReason: string | null;
};

/**
 * Pick the active OCR provider. Order of precedence:
 *   1. preferredId argument (from user preference)
 *   2. process.env.OCR_PROVIDER
 *   3. "mock"
 *
 * If the requested provider's API key is not configured, falls back to "mock"
 * and reports the reason so the caller can surface a warning.
 */
export function resolveOcrProvider(preferredId?: string | null): ResolvedProvider {
  const requested = pickRequested(preferredId);
  const meta = ocrProviderRegistry[requested];

  if (!isProviderKeyConfigured(meta)) {
    return {
      provider: instantiate("mock"),
      id: "mock",
      fallbackReason: `Provider "${meta.label}" requires ${meta.envVar}, which is not configured. Falling back to Mock.`,
    };
  }

  return {
    provider: instantiate(requested),
    id: requested,
    fallbackReason: null,
  };
}

function pickRequested(preferredId?: string | null): OcrProviderId {
  if (preferredId && isOcrProviderId(preferredId)) return preferredId;
  const envValue = process.env.OCR_PROVIDER;
  if (envValue && isOcrProviderId(envValue)) return envValue;
  return "mock";
}

function instantiate(id: OcrProviderId): OcrProvider {
  switch (id) {
    case "mock":
      return new MockOcrProvider();
    case "gemini":
      return new GeminiOcrProvider();
    case "openai":
      return new OpenAiOcrProvider();
  }
}
