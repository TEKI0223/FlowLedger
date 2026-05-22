export const currencies = ["JPY", "CNY"] as const;
export const transactionTypes = ["income", "expense", "transfer", "adjustment"] as const;
export const accountTypes = ["cash", "bank", "credit_card", "wallet"] as const;

export type Currency = (typeof currencies)[number];
export type TransactionType = (typeof transactionTypes)[number];
export type AccountType = (typeof accountTypes)[number];

export const currencyMinorUnits: Record<Currency, number> = {
  JPY: 0,
  CNY: 2,
};

export const currencyLabels: Record<Currency, string> = {
  JPY: "日元",
  CNY: "人民币",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "收入",
  expense: "支出",
  transfer: "转账",
  adjustment: "调整",
};

export const accountTypeLabels: Record<AccountType, string> = {
  cash: "现金",
  bank: "银行",
  credit_card: "信用卡",
  wallet: "余额账户",
};

export type Money = {
  amountMinor: number;
  currency: Currency;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balanceMinor: number;
  includeInNetWorth: boolean;
};

export type Transaction = {
  id: string;
  occurredOn: string;
  postedOn?: string;
  type: TransactionType;
  money: Money;
  categoryId?: string;
  sourceAccountId?: string;
  targetAccountId?: string;
  paymentMethodId?: string;
  note?: string;
};

export type AccountBalanceImpact = {
  accountId: string;
  amountMinor: number;
};

export function formatMoney({ amountMinor, currency }: Money): string {
  return new Intl.NumberFormat(currency === "JPY" ? "ja-JP" : "zh-CN", {
    style: "currency",
    currency,
    maximumFractionDigits: currencyMinorUnits[currency],
    minimumFractionDigits: currencyMinorUnits[currency],
  }).format(amountMinor / 10 ** currencyMinorUnits[currency]);
}

export function formatMinorForInput({ amountMinor, currency }: Money): string {
  return (amountMinor / 10 ** currencyMinorUnits[currency]).toFixed(currencyMinorUnits[currency]);
}

export function parseMoneyToMinor(amount: string, currency: Currency): number {
  const normalized = amount.trim().replaceAll(",", "");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("金额格式不正确");
  }

  const sign = normalized.startsWith("-") ? -1 : 1;
  const unsigned = normalized.replace(/^-/, "");
  const [majorPart, rawMinorPart = ""] = unsigned.split(".");
  const minorUnits = currencyMinorUnits[currency];

  if (rawMinorPart.length > minorUnits) {
    throw new Error(`${currency} 最多支持 ${minorUnits} 位小数`);
  }

  const major = Number.parseInt(majorPart, 10);
  const minor = Number.parseInt(rawMinorPart.padEnd(minorUnits, "0") || "0", 10);
  const amountMinor = major * 10 ** minorUnits + minor;

  return sign * amountMinor;
}

export function convertToCurrency(
  source: Money,
  targetCurrency: Currency,
  rate: number,
): number {
  if (source.currency === targetCurrency) {
    return source.amountMinor;
  }

  const sourceMinorUnits = currencyMinorUnits[source.currency];
  const targetMinorUnits = currencyMinorUnits[targetCurrency];

  const sourceMajor = source.amountMinor / 10 ** sourceMinorUnits;
  const targetMajor = sourceMajor * rate;

  return Math.round(targetMajor * 10 ** targetMinorUnits);
}

export function getTransactionBalanceImpacts(transaction: Transaction): AccountBalanceImpact[] {
  const amountMinor = Math.abs(transaction.money.amountMinor);

  switch (transaction.type) {
    case "income":
      return transaction.targetAccountId
        ? [{ accountId: transaction.targetAccountId, amountMinor }]
        : [];
    case "expense":
      return transaction.sourceAccountId
        ? [{ accountId: transaction.sourceAccountId, amountMinor: -amountMinor }]
        : [];
    case "transfer": {
      const impacts: AccountBalanceImpact[] = [];

      if (transaction.sourceAccountId) {
        impacts.push({ accountId: transaction.sourceAccountId, amountMinor: -amountMinor });
      }

      if (transaction.targetAccountId) {
        impacts.push({ accountId: transaction.targetAccountId, amountMinor });
      }

      return impacts;
    }
    case "adjustment":
      return transaction.targetAccountId
        ? [{ accountId: transaction.targetAccountId, amountMinor: transaction.money.amountMinor }]
        : [];
  }
}
