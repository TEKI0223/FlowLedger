import { z } from "zod";
import { currencies } from "@/domain/finance";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "occurredOn must be YYYY-MM-DD")
  .nullable();

export const receiptDataSchema = z.object({
  amount: z.string().trim().min(1).nullable(),
  currency: z.enum(currencies).nullable(),
  occurredOn: isoDate,
  categoryId: z.string().trim().min(1).nullable(),
  note: z.string().trim().min(1).max(200).nullable(),
});

export type ParsedReceipt = z.infer<typeof receiptDataSchema>;
