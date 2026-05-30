import type { Currency } from "@/domain/finance";

export type CategoryHint = {
  id: string;
  label: string;
};

export type ReceiptData = {
  amount: string | null;
  currency: Currency | null;
  occurredOn: string | null;
  categoryId: string | null;
  note: string | null;
};

export type OcrExtractInput = {
  imageBase64: string;
  mimeType: string;
  categories: CategoryHint[];
};

export interface OcrProvider {
  readonly id: string;
  extractReceipt(input: OcrExtractInput): Promise<ReceiptData>;
}

export type OcrErrorCode =
  | "invalid_image"
  | "image_too_large"
  | "provider_unavailable"
  | "parse_failed"
  | "rate_limit"
  | "upstream_error";

export class OcrError extends Error {
  readonly code: OcrErrorCode;

  constructor(code: OcrErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "OcrError";
  }
}
