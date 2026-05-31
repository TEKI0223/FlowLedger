import { integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  lastDigits: text("last_digits"),
  type: text("type", { enum: ["cash", "bank", "credit_card", "wallet"] }).notNull(),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  balanceMinor: integer("balance_minor").notNull().default(0),
  includeInNetWorth: integer("include_in_net_worth", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const paymentMethods = sqliteTable("payment_methods", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["card", "wallet", "cash", "bank_transfer", "other"] })
    .notNull()
    .default("other"),
  currency: text("currency", { enum: ["JPY", "CNY"] })
    .notNull()
    .default("JPY"),
  defaultAccountId: text("default_account_id").references(() => accounts.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  parentId: text("parent_id"),
  iconKey: text("icon_key"),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  occurredOn: text("occurred_on").notNull(),
  postedOn: text("posted_on"),
  type: text("type", { enum: ["income", "expense", "transfer", "adjustment"] }).notNull(),
  amountMinor: integer("amount_minor").notNull(),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  categoryId: text("category_id").references(() => categories.id),
  sourceAccountId: text("source_account_id").references(() => accounts.id),
  targetAccountId: text("target_account_id").references(() => accounts.id),
  paymentMethodId: text("payment_method_id").references(() => paymentMethods.id),
  recurringItemId: text("recurring_item_id"),
  refundTrackerId: text("refund_tracker_id"),
  /**
   * 当 sourceAccount 是信用卡且用户想把这笔交易归到特定账单时使用：
   * 存目标账单的 periodEnd (YYYY-MM-DD)。
   * 为 null 时按 occurredOn 自动归期（默认）。
   */
  creditCardStatementOverride: text("credit_card_statement_override"),
  includeInExpenseStats: integer("include_in_expense_stats", { mode: "boolean" })
    .notNull()
    .default(true),
  includeInCashflowStats: integer("include_in_cashflow_stats", { mode: "boolean" })
    .notNull()
    .default(true),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const quickEntryTemplates = sqliteTable("quick_entry_templates", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense", "transfer", "adjustment"] })
    .notNull()
    .default("expense"),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  amountMinor: integer("amount_minor"),
  categoryId: text("category_id").references(() => categories.id),
  sourceAccountId: text("source_account_id").references(() => accounts.id),
  targetAccountId: text("target_account_id").references(() => accounts.id),
  paymentMethodId: text("payment_method_id").references(() => paymentMethods.id),
  note: text("note"),
  sortOrder: integer("sort_order").notNull().default(0),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const creditCards = sqliteTable("credit_cards", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  closingDay: integer("closing_day").notNull(),
  paymentDay: integer("payment_day").notNull(),
  /** 扣款发生在 closingDate 之后第几个月：0=当月、1=次月（默认，日本卡通行做法）、2=次次月 */
  paymentMonthOffset: integer("payment_month_offset").notNull().default(1),
  cycleBoundary: text("cycle_boundary", { enum: ["inclusive", "exclusive"] })
    .notNull()
    .default("inclusive"),
  repaymentAccountId: text("repayment_account_id").references(() => accounts.id),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const recurringItems = sqliteTable("recurring_items", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense", "transfer"] }).notNull(),
  amountMinor: integer("amount_minor"),
  amountFixed: integer("amount_fixed", { mode: "boolean" }).notNull().default(false),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  frequency: text("frequency", { enum: ["weekly", "monthly", "bimonthly", "yearly"] })
    .notNull()
    .default("monthly"),
  nextDate: text("next_date").notNull(),
  dateShiftPolicy: text("date_shift_policy", {
    enum: ["auto", "none", "previous", "next"],
  })
    .notNull()
    .default("auto"),
  categoryId: text("category_id").references(() => categories.id),
  sourceAccountId: text("source_account_id").references(() => accounts.id),
  targetAccountId: text("target_account_id").references(() => accounts.id),
  paymentMethodId: text("payment_method_id").references(() => paymentMethods.id),
  note: text("note"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const refundTrackers = sqliteTable("refund_trackers", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  originalTransactionId: text("original_transaction_id")
    .notNull()
    .references(() => transactions.id),
  amountMinor: integer("amount_minor").notNull(),
  receivedAmountMinor: integer("received_amount_minor").notNull().default(0),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  expectedAccountId: text("expected_account_id").references(() => accounts.id),
  expectedOn: text("expected_on"),
  receivedOn: text("received_on"),
  status: text("status", { enum: ["pending", "partial", "received", "cancelled"] }).notNull(),
  note: text("note"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const exchangeRates = sqliteTable("exchange_rates", {
  id: text("id").primaryKey(),
  fromCurrency: text("from_currency", { enum: ["JPY", "CNY"] }).notNull(),
  toCurrency: text("to_currency", { enum: ["JPY", "CNY"] }).notNull(),
  rate: real("rate").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userPreferences = sqliteTable(
  "user_preferences",
  {
    ownerUserId: text("owner_user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerUserId, table.key] })],
);

export const installmentPlans = sqliteTable("installment_plans", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull(),
  originalTransactionId: text("original_transaction_id")
    .notNull()
    .references(() => transactions.id),
  totalAmountMinor: integer("total_amount_minor").notNull(),
  currency: text("currency", { enum: ["JPY", "CNY"] }).notNull(),
  periods: integer("periods").notNull(),
  amountPerPeriodMinor: integer("amount_per_period_minor").notNull(),
  firstPaymentOn: text("first_payment_on").notNull(),
  completedPeriods: integer("completed_periods").notNull().default(0),
  status: text("status", { enum: ["active", "completed", "cancelled"] }).notNull(),
  feeAmountMinor: integer("fee_amount_minor"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint)],
);

export const pushReminderDeliveries = sqliteTable(
  "push_reminder_deliveries",
  {
    ownerUserId: text("owner_user_id").notNull(),
    reminderKey: text("reminder_key").notNull(),
    stage: text("stage", { enum: ["first_seen", "due_today"] }).notNull(),
    sentAt: text("sent_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.ownerUserId, table.reminderKey, table.stage] })],
);
