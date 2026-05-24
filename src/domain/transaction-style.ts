import type { TransactionType } from "./finance";

export const transactionTypeColorClass: Record<TransactionType, string> = {
  income: "border-income/20 bg-income/5 text-income",
  expense: "border-expense/20 bg-expense/5 text-expense",
  transfer: "border-transfer/20 bg-transfer/5 text-transfer",
  adjustment: "border-adjustment/20 bg-adjustment/5 text-adjustment",
};

export const transactionTypeCardClass: Record<TransactionType, string> = {
  income: "border-l-income bg-income/5",
  expense: "border-l-expense bg-expense/5",
  transfer: "border-l-transfer bg-transfer/5",
  adjustment: "border-l-adjustment bg-adjustment/5",
};
