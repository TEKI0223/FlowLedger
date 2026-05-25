import {
  currencies,
  transactionTypes,
  type Currency,
  type TransactionType,
} from "@/domain/finance";

export const transactionDateFilterOptions = [
  { value: "all", label: "全部" },
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "6m", label: "近半年" },
  { value: "month", label: "本月" },
  { value: "year", label: "今年" },
] as const;

export const transactionAmountFilterOptions = [
  { value: "", label: "全部" },
  { value: "lt50", label: "< 50" },
  { value: "50-100", label: "50 - 100" },
  { value: "100-1000", label: "100 - 1,000" },
  { value: "1000-5000", label: "1,000 - 5,000" },
  { value: "5000-10000", label: "5,000 - 10,000" },
  { value: "gte10000", label: ">= 10,000" },
] as const;

export type TransactionDateFilter = (typeof transactionDateFilterOptions)[number]["value"];
export type TransactionAmountFilter = (typeof transactionAmountFilterOptions)[number]["value"];

export type TransactionFilters = {
  date?: TransactionDateFilter;
  categoryId?: string;
  amount?: Exclude<TransactionAmountFilter, "">;
  accountId?: string;
  paymentMethodId?: string;
  type?: TransactionType;
  currency?: Currency;
};

type RawFilters = Record<string, string | string[] | undefined>;

const dateValues = new Set<string>(transactionDateFilterOptions.map((option) => option.value));
const amountValues = new Set<string>(transactionAmountFilterOptions.map((option) => option.value));
const typeValues = new Set<string>(transactionTypes);
const currencyValues = new Set<string>(currencies);

export function parseTransactionFilters(raw: RawFilters): TransactionFilters {
  const date = first(raw.date) ?? "month";
  const amount = first(raw.amount);
  const type = first(raw.type);
  const currency = first(raw.currency);

  return {
    date: date && dateValues.has(date) ? (date as TransactionFilters["date"]) : undefined,
    categoryId: first(raw.categoryId),
    amount:
      amount && amountValues.has(amount) ? (amount as TransactionFilters["amount"]) : undefined,
    accountId: first(raw.accountId),
    paymentMethodId: first(raw.paymentMethodId),
    type: type && typeValues.has(type) ? (type as TransactionType) : undefined,
    currency: currency && currencyValues.has(currency) ? (currency as Currency) : undefined,
  };
}

export function countActiveTransactionFilters(filters: TransactionFilters): number {
  return Object.values(filters).filter(Boolean).length;
}

function first(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}
