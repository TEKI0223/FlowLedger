import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";

const defaultDatabaseUrl = "./data/flowledger.db";

function normalizeDatabasePath(databaseUrl) {
  const withoutQuery = databaseUrl.split("?")[0] ?? databaseUrl;

  if (withoutQuery.startsWith("file:")) {
    return withoutQuery.slice("file:".length);
  }

  return withoutQuery;
}

const databasePath = normalizeDatabasePath(process.env.DATABASE_URL ?? defaultDatabaseUrl);
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("foreign_keys = ON");

const now = new Date().toISOString();

const accounts = [
  ["jpy-cash", "日元现金", "cash", "JPY", 0, 1, "现金账户"],
  ["jp-bank-main", "日本银行账户", "bank", "JPY", 0, 1, "工资和信用卡还款主账户"],
  ["jpy-credit-card-a", "日元信用卡 A", "credit_card", "JPY", 0, 0, "默认信用卡"],
  ["jpy-credit-card-b", "日元信用卡 B", "credit_card", "JPY", 0, 0, "备用信用卡"],
  ["paypay", "PayPay", "wallet", "JPY", 0, 1, "日元余额型账户"],
  ["cny-bank-main", "人民币银行卡", "bank", "CNY", 0, 1, "人民币主账户"],
  ["wechat-balance", "微信余额", "wallet", "CNY", 0, 1, "人民币余额型账户"],
  ["alipay-balance", "支付宝余额", "wallet", "CNY", 0, 1, "人民币余额型账户"],
  ["cny-cash", "人民币现金", "cash", "CNY", 0, 1, "现金账户"],
];

const paymentMethods = [
  ["credit-card-a", "信用卡 A", "jpy-credit-card-a"],
  ["credit-card-b", "信用卡 B", "jpy-credit-card-b"],
  ["apple-pay", "Apple Pay", "jpy-credit-card-a"],
  ["paypay", "PayPay", "paypay"],
  ["wechat-pay", "微信支付", "wechat-balance"],
  ["alipay", "支付宝", "alipay-balance"],
  ["jpy-cash", "日元现金", "jpy-cash"],
  ["cny-cash", "人民币现金", "cny-cash"],
  ["jp-bank-transfer", "日本银行转账", "jp-bank-main"],
  ["cny-bank-transfer", "人民币银行卡", "cny-bank-main"],
];

const categories = [
  ["housing", "居住", null],
  ["rent", "房租", "housing"],
  ["utilities", "水电燃气", "housing"],
  ["internet", "网络", "housing"],
  ["food", "饮食", null],
  ["grocery", "超市", "food"],
  ["convenience-store", "便利店", "food"],
  ["dining", "外食", "food"],
  ["coffee", "咖啡", "food"],
  ["transport", "交通", null],
  ["shopping", "购物", null],
  ["daily-goods", "日用品", "shopping"],
  ["electronics", "电子产品", "shopping"],
  ["subscription", "订阅", null],
  ["medical", "医疗", null],
  ["entertainment", "社交娱乐", null],
  ["travel", "旅行", null],
  ["fees-tax", "手续费和税费", null],
  ["income-salary", "工资", null],
  ["refund", "退款", null],
  ["other", "其他", null],
];

const quickEntryTemplates = [
  [
    "grocery",
    "超市",
    "expense",
    "JPY",
    null,
    "grocery",
    "jp-bank-main",
    null,
    "apple-pay",
    null,
    10,
    1,
  ],
  [
    "convenience-store",
    "便利店",
    "expense",
    "JPY",
    null,
    "convenience-store",
    "paypay",
    null,
    "paypay",
    null,
    20,
    1,
  ],
  [
    "dining",
    "外食",
    "expense",
    "JPY",
    null,
    "dining",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    null,
    30,
    1,
  ],
  ["coffee", "咖啡", "expense", "JPY", null, "coffee", "paypay", null, "paypay", null, 40, 1],
  [
    "transport",
    "交通",
    "expense",
    "JPY",
    null,
    "transport",
    "jpy-cash",
    null,
    "jpy-cash",
    null,
    50,
    1,
  ],
  [
    "online-shopping",
    "网购",
    "expense",
    "JPY",
    null,
    "shopping",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    "平台标签待补充",
    60,
    1,
  ],
  [
    "paypay-expense",
    "PayPay 消费",
    "expense",
    "JPY",
    null,
    "other",
    "paypay",
    null,
    "paypay",
    null,
    70,
    1,
  ],
  [
    "cash-expense",
    "现金消费",
    "expense",
    "JPY",
    null,
    "other",
    "jpy-cash",
    null,
    "jpy-cash",
    null,
    80,
    1,
  ],
];

const creditCards = [
  ["credit-card-a", "jpy-credit-card-a", 25, 10, "jp-bank-main", 1],
  ["credit-card-b", "jpy-credit-card-b", 25, 10, "jp-bank-main", 1],
];

const insertAccount = db.prepare(`
  insert into accounts (id, name, type, currency, balance_minor, include_in_net_worth, note, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    include_in_net_worth = excluded.include_in_net_worth,
    note = excluded.note,
    updated_at = excluded.updated_at
`);

const insertPaymentMethod = db.prepare(`
  insert into payment_methods (id, name, default_account_id, created_at, updated_at)
  values (?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    default_account_id = excluded.default_account_id,
    updated_at = excluded.updated_at
`);

const insertCategory = db.prepare(`
  insert into categories (id, name, parent_id, created_at, updated_at)
  values (?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    parent_id = excluded.parent_id,
    updated_at = excluded.updated_at
`);

const insertQuickEntryTemplate = db.prepare(`
  insert into quick_entry_templates (
    id,
    name,
    type,
    currency,
    amount_minor,
    category_id,
    source_account_id,
    target_account_id,
    payment_method_id,
    note,
    sort_order,
    enabled,
    created_at,
    updated_at
  )
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    amount_minor = excluded.amount_minor,
    category_id = excluded.category_id,
    source_account_id = excluded.source_account_id,
    target_account_id = excluded.target_account_id,
    payment_method_id = excluded.payment_method_id,
    note = excluded.note,
    sort_order = excluded.sort_order,
    enabled = excluded.enabled,
    updated_at = excluded.updated_at
`);

const insertCreditCard = db.prepare(`
  insert into credit_cards (id, account_id, closing_day, payment_day, repayment_account_id, enabled, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    account_id = excluded.account_id,
    closing_day = excluded.closing_day,
    payment_day = excluded.payment_day,
    repayment_account_id = excluded.repayment_account_id,
    enabled = excluded.enabled,
    updated_at = excluded.updated_at
`);

const seed = db.transaction(() => {
  for (const account of accounts) {
    insertAccount.run(...account, now, now);
  }

  for (const paymentMethod of paymentMethods) {
    insertPaymentMethod.run(...paymentMethod, now, now);
  }

  for (const category of categories) {
    insertCategory.run(...category, now, now);
  }

  for (const template of quickEntryTemplates) {
    insertQuickEntryTemplate.run(...template, now, now);
  }

  for (const creditCard of creditCards) {
    insertCreditCard.run(...creditCard, now, now);
  }
});

seed();

console.log(`Seeded FlowLedger defaults into ${databasePath}`);
