import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";

const defaultUrl = "file:./data/flowledger.db";
const url = process.env.DATABASE_URL ?? defaultUrl;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url.startsWith("file:") && process.env.ALLOW_REMOTE_DEV_SEED !== "1") {
  throw new Error(
    "Refusing to seed development data into a remote database. Set ALLOW_REMOTE_DEV_SEED=1 if this is intentional.",
  );
}

if (url.startsWith("file:")) {
  const filePath = url.slice("file:".length).split("?")[0];
  if (filePath) mkdirSync(dirname(filePath), { recursive: true });
}

const client = createClient({ url, authToken });

if (url.startsWith("file:")) {
  await client.execute("PRAGMA foreign_keys = ON");
}

const now = new Date().toISOString();
const dateDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const accounts = [
  ["jpy-cash", "日元现金", "cash", "JPY", 36000, 1, "现金账户", "1234"],
  ["jp-bank-main", "日本银行账户", "bank", "JPY", 428000, 1, "工资和信用卡还款主账户", "5678"],
  ["jpy-credit-card-a", "日元信用卡 A", "credit_card", "JPY", -84600, 0, "默认信用卡", "9012"],
  ["jpy-credit-card-b", "日元信用卡 B", "credit_card", "JPY", -23800, 0, "备用信用卡", "3456"],
  ["paypay", "PayPay", "wallet", "JPY", 28600, 1, "日元余额型账户", null],
  ["cny-bank-main", "人民币银行卡", "bank", "CNY", 1850000, 1, "人民币主账户", "2222"],
  ["wechat-balance", "微信余额", "wallet", "CNY", 42680, 1, "人民币余额型账户", null],
  ["alipay-balance", "支付宝余额", "wallet", "CNY", 298900, 1, "人民币余额型账户", null],
  ["cny-cash", "人民币现金", "cash", "CNY", 62000, 1, "现金账户", null],
];

const paymentMethods = [
  ["credit-card-a", "信用卡 A", "card", "JPY", "jpy-credit-card-a"],
  ["credit-card-b", "信用卡 B", "card", "JPY", "jpy-credit-card-b"],
  ["apple-pay", "Apple Pay", "wallet", "JPY", "jpy-credit-card-a"],
  ["paypay", "PayPay", "wallet", "JPY", "paypay"],
  ["wechat-pay", "微信支付", "wallet", "CNY", "wechat-balance"],
  ["alipay", "支付宝", "wallet", "CNY", "alipay-balance"],
  ["jpy-cash", "日元现金", "cash", "JPY", "jpy-cash"],
  ["cny-cash", "人民币现金", "cash", "CNY", "cny-cash"],
  ["jp-bank-transfer", "日本银行转账", "bank_transfer", "JPY", "jp-bank-main"],
  ["cny-bank-transfer", "人民币银行卡", "card", "CNY", "cny-bank-main"],
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
    "ready-meal",
    "简餐",
    "expense",
    "JPY",
    null,
    "ready-meal",
    "paypay",
    null,
    "paypay",
    "便利店 / 快餐等",
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
    "electronics",
    "电子产品",
    "expense",
    "JPY",
    null,
    "electronics",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    "渠道写入备注，例如 Amazon / 线下门店",
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

const exchangeRates = [
  ["cny-to-jpy", "CNY", "JPY", 21.5],
  ["jpy-to-cny", "JPY", "CNY", 1 / 21.5],
];

const transactions = [
  [
    "dev-tx-001",
    dateDaysAgo(2),
    null,
    "income",
    360000,
    "JPY",
    "income-salary",
    null,
    "jp-bank-main",
    "jp-bank-transfer",
    null,
    null,
    1,
    1,
    "测试：本月工资",
  ],
  [
    "dev-tx-002",
    dateDaysAgo(3),
    null,
    "expense",
    128000,
    "JPY",
    "rent",
    "jp-bank-main",
    null,
    "jp-bank-transfer",
    null,
    null,
    1,
    1,
    "测试：房租",
  ],
  [
    "dev-tx-003",
    dateDaysAgo(4),
    null,
    "expense",
    8400,
    "JPY",
    "electricity",
    "jp-bank-main",
    null,
    "jp-bank-transfer",
    null,
    null,
    1,
    1,
    "测试：电费",
  ],
  [
    "dev-tx-004",
    dateDaysAgo(5),
    null,
    "expense",
    5200,
    "JPY",
    "internet",
    "jp-bank-main",
    null,
    "jp-bank-transfer",
    null,
    null,
    1,
    1,
    "测试：网络",
  ],
  [
    "dev-tx-005",
    dateDaysAgo(1),
    null,
    "expense",
    7560,
    "JPY",
    "grocery",
    "jpy-credit-card-a",
    null,
    "apple-pay",
    null,
    null,
    1,
    1,
    "测试：周末采购",
  ],
  [
    "dev-tx-006",
    dateDaysAgo(6),
    null,
    "expense",
    1280,
    "JPY",
    "fruits",
    "paypay",
    null,
    "paypay",
    null,
    null,
    1,
    1,
    "测试：水果",
  ],
  [
    "dev-tx-007",
    dateDaysAgo(7),
    null,
    "expense",
    580,
    "JPY",
    "coffee",
    "paypay",
    null,
    "paypay",
    null,
    null,
    1,
    1,
    "测试：咖啡",
  ],
  [
    "dev-tx-008",
    dateDaysAgo(8),
    null,
    "expense",
    4200,
    "JPY",
    "dining",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    null,
    null,
    1,
    1,
    "测试：外食",
  ],
  [
    "dev-tx-009",
    dateDaysAgo(9),
    null,
    "expense",
    960,
    "JPY",
    "transport",
    "jpy-cash",
    null,
    "jpy-cash",
    null,
    null,
    1,
    1,
    "测试：电车",
  ],
  [
    "dev-tx-010",
    dateDaysAgo(10),
    null,
    "expense",
    3000,
    "JPY",
    "genshin-impact",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    null,
    null,
    1,
    1,
    "测试：游戏充值",
  ],
  [
    "dev-tx-011",
    dateDaysAgo(11),
    null,
    "expense",
    2140,
    "JPY",
    "tissues",
    "jpy-credit-card-b",
    null,
    "credit-card-b",
    null,
    null,
    1,
    1,
    "测试：日用品",
  ],
  [
    "dev-tx-012",
    dateDaysAgo(12),
    null,
    "expense",
    1860,
    "JPY",
    "medicine",
    "jpy-cash",
    null,
    "jpy-cash",
    null,
    null,
    1,
    1,
    "测试：药品",
  ],
  [
    "dev-tx-013",
    dateDaysAgo(13),
    null,
    "expense",
    16800,
    "JPY",
    "travel-transportation",
    "jpy-credit-card-a",
    null,
    "credit-card-a",
    null,
    null,
    1,
    1,
    "测试：旅行交通",
  ],
  [
    "dev-tx-014",
    dateDaysAgo(3),
    null,
    "income",
    1800000,
    "CNY",
    "income-salary",
    null,
    "cny-bank-main",
    "cny-bank-transfer",
    null,
    null,
    1,
    1,
    "测试：人民币收入",
  ],
  [
    "dev-tx-015",
    dateDaysAgo(4),
    null,
    "expense",
    12680,
    "CNY",
    "grocery",
    "wechat-balance",
    null,
    "wechat-pay",
    null,
    null,
    1,
    1,
    "测试：微信买菜",
  ],
  [
    "dev-tx-016",
    dateDaysAgo(14),
    null,
    "expense",
    32900,
    "CNY",
    "clothing",
    "alipay-balance",
    null,
    "alipay",
    null,
    null,
    1,
    1,
    "测试：衣服",
  ],
  [
    "dev-tx-017",
    dateDaysAgo(5),
    null,
    "transfer",
    20000,
    "JPY",
    null,
    "jp-bank-main",
    "paypay",
    "jp-bank-transfer",
    null,
    null,
    0,
    1,
    "测试：给 PayPay 充值",
  ],
  [
    "dev-tx-018",
    dateDaysAgo(6),
    null,
    "transfer",
    100000,
    "CNY",
    null,
    "cny-bank-main",
    "wechat-balance",
    "cny-bank-transfer",
    null,
    null,
    0,
    1,
    "测试：转入微信余额",
  ],
  [
    "dev-tx-019",
    dateDaysAgo(15),
    null,
    "adjustment",
    3000,
    "JPY",
    null,
    null,
    "jpy-cash",
    null,
    null,
    null,
    0,
    0,
    "测试：现金余额校准",
  ],
  [
    "dev-tx-020",
    dateDaysAgo(16),
    null,
    "income",
    2480,
    "JPY",
    "refund",
    null,
    "paypay",
    "paypay",
    null,
    null,
    0,
    1,
    "测试：退款到账",
  ],
  [
    "dev-tx-021",
    dateDaysAgo(18),
    null,
    "transfer",
    90000,
    "JPY",
    null,
    "jp-bank-main",
    "jpy-credit-card-a",
    "jp-bank-transfer",
    null,
    null,
    0,
    1,
    "测试：信用卡还款",
  ],
];

const SQL_ACCOUNT = `
  insert into accounts (id, name, type, currency, balance_minor, include_in_net_worth, note, last_digits, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    balance_minor = excluded.balance_minor,
    include_in_net_worth = excluded.include_in_net_worth,
    note = excluded.note,
    last_digits = excluded.last_digits,
    updated_at = excluded.updated_at
`;

const SQL_PAYMENT_METHOD = `
  insert into payment_methods (id, name, type, currency, default_account_id, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    default_account_id = excluded.default_account_id,
    updated_at = excluded.updated_at
`;

const SQL_QUICK_ENTRY = `
  insert into quick_entry_templates (
    id, name, type, currency, amount_minor, category_id,
    source_account_id, target_account_id, payment_method_id,
    note, sort_order, enabled, created_at, updated_at
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
`;

const SQL_CREDIT_CARD = `
  insert into credit_cards (id, account_id, closing_day, payment_day, repayment_account_id, enabled, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    account_id = excluded.account_id,
    closing_day = excluded.closing_day,
    payment_day = excluded.payment_day,
    repayment_account_id = excluded.repayment_account_id,
    enabled = excluded.enabled,
    updated_at = excluded.updated_at
`;

const SQL_EXCHANGE_RATE = `
  insert into exchange_rates (id, from_currency, to_currency, rate, updated_at)
  values (?, ?, ?, ?, ?)
  on conflict(id) do update set
    from_currency = excluded.from_currency,
    to_currency = excluded.to_currency,
    rate = excluded.rate,
    updated_at = excluded.updated_at
`;

const SQL_TRANSACTION = `
  insert into transactions (
    id, occurred_on, posted_on, type, amount_minor, currency,
    category_id, source_account_id, target_account_id, payment_method_id,
    recurring_item_id, refund_tracker_id, include_in_expense_stats,
    include_in_cashflow_stats, note, created_at, updated_at
  )
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    occurred_on = excluded.occurred_on,
    posted_on = excluded.posted_on,
    type = excluded.type,
    amount_minor = excluded.amount_minor,
    currency = excluded.currency,
    category_id = excluded.category_id,
    source_account_id = excluded.source_account_id,
    target_account_id = excluded.target_account_id,
    payment_method_id = excluded.payment_method_id,
    recurring_item_id = excluded.recurring_item_id,
    refund_tracker_id = excluded.refund_tracker_id,
    include_in_expense_stats = excluded.include_in_expense_stats,
    include_in_cashflow_stats = excluded.include_in_cashflow_stats,
    note = excluded.note,
    updated_at = excluded.updated_at
`;

const statements = [
  ...accounts.map((row) => ({ sql: SQL_ACCOUNT, args: [...row, now, now] })),
  ...paymentMethods.map((row) => ({ sql: SQL_PAYMENT_METHOD, args: [...row, now, now] })),
  ...quickEntryTemplates.map((row) => ({ sql: SQL_QUICK_ENTRY, args: [...row, now, now] })),
  ...creditCards.map((row) => ({ sql: SQL_CREDIT_CARD, args: [...row, now, now] })),
  ...exchangeRates.map((row) => ({ sql: SQL_EXCHANGE_RATE, args: [...row, now] })),
  ...transactions.map((row) => ({ sql: SQL_TRANSACTION, args: [...row, now, now] })),
];

await client.batch(statements, "deferred");
client.close();

const target = url.startsWith("file:") ? url.slice("file:".length).split("?")[0] : url;
console.log(`Seeded FlowLedger development data into ${target}`);
