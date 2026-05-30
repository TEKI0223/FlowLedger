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
const ownerUserId = process.env.FLOWLEDGER_DEV_SEED_USER_ID ?? "zhang";
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
    "便利店",
    "expense",
    "JPY",
    null,
    "dining",
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
    "grocery",
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
    "daily-goods",
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

  // ── 咖啡（多次少额，符合实际习惯）────────────────────────────────────
  ["dev-tx-022", dateDaysAgo(2), null, "expense", 520, "JPY", "coffee", "paypay", null, "paypay", null, null, 1, 1, "测试：早咖啡"],
  ["dev-tx-023", dateDaysAgo(5), null, "expense", 480, "JPY", "coffee", "paypay", null, "paypay", null, null, 1, 1, "测试：咖啡"],
  ["dev-tx-024", dateDaysAgo(12), null, "expense", 620, "JPY", "coffee", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：星巴克"],
  ["dev-tx-025", dateDaysAgo(19), null, "expense", 580, "JPY", "coffee", "paypay", null, "paypay", null, null, 1, 1, "测试：手冲"],

  // ── 酒 / 零食 ──────────────────────────────────────────────────────
  ["dev-tx-026", dateDaysAgo(8), null, "expense", 2400, "JPY", "alcohol", "paypay", null, "paypay", null, null, 1, 1, "测试：啤酒 6 罐"],
  ["dev-tx-027", dateDaysAgo(22), null, "expense", 3800, "JPY", "alcohol", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：日本酒"],
  ["dev-tx-028", dateDaysAgo(4), null, "expense", 680, "JPY", "snacks", "paypay", null, "paypay", null, null, 1, 1, "测试：便利店零食"],
  ["dev-tx-029", dateDaysAgo(16), null, "expense", 1240, "JPY", "snacks", "jpy-cash", null, "jpy-cash", null, null, 1, 1, "测试：饼干 巧克力"],

  // ── 日用品 / 美妆 ──────────────────────────────────────────────────
  ["dev-tx-030", dateDaysAgo(10), null, "expense", 3680, "JPY", "daily-goods", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：ドラッグストア 杂货"],
  ["dev-tx-031", dateDaysAgo(25), null, "expense", 1580, "JPY", "daily-goods", "jpy-cash", null, "jpy-cash", null, null, 1, 1, "测试：厨房纸 卷纸"],
  ["dev-tx-032", dateDaysAgo(20), null, "expense", 5400, "JPY", "beauty", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：护肤套装"],

  // ── 外食（多次，正餐 + 居酒屋）─────────────────────────────────────
  ["dev-tx-033", dateDaysAgo(1), null, "expense", 8600, "JPY", "dining", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：居酒屋 同事聚餐"],
  ["dev-tx-034", dateDaysAgo(7), null, "expense", 1080, "JPY", "dining", "paypay", null, "paypay", null, null, 1, 1, "测试：拉面"],
  ["dev-tx-035", dateDaysAgo(14), null, "expense", 2200, "JPY", "dining", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：寿司午餐"],
  ["dev-tx-036", dateDaysAgo(21), null, "expense", 3400, "JPY", "dining", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：定食"],

  // ── 上月固定支出（房租 / 水 / 燃气 / 电 / 网络）─────────────────────
  ["dev-tx-037", dateDaysAgo(33), null, "expense", 128000, "JPY", "rent", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：上月房租"],
  ["dev-tx-038", dateDaysAgo(34), null, "expense", 7800, "JPY", "electricity", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：上月电费"],
  ["dev-tx-039", dateDaysAgo(34), null, "expense", 2680, "JPY", "water", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：上月水费"],
  ["dev-tx-040", dateDaysAgo(34), null, "expense", 4200, "JPY", "gas", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：上月燃气"],
  ["dev-tx-041", dateDaysAgo(35), null, "expense", 5200, "JPY", "internet", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：上月网络"],

  // ── 上月工资 ──────────────────────────────────────────────────────
  ["dev-tx-042", dateDaysAgo(32), null, "income", 360000, "JPY", "income-salary", null, "jp-bank-main", "jp-bank-transfer", null, null, 1, 1, "测试：上月工资"],

  // ── 游戏 / 订阅 / 电子产品 ─────────────────────────────────────────
  ["dev-tx-043", dateDaysAgo(15), null, "expense", 2980, "JPY", "zenless-zone-zero", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：绝区零月卡"],
  ["dev-tx-044", dateDaysAgo(40), null, "expense", 6480, "JPY", "ps5-software", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：PS5 实体游戏"],
  ["dev-tx-045", dateDaysAgo(15), null, "expense", 1480, "JPY", "subscription", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：Netflix 月费"],
  ["dev-tx-046", dateDaysAgo(28), null, "expense", 38000, "JPY", "electronics", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：Amazon 键盘"],

  // ── 医疗 / 娱乐 / 礼物 / 手续费 ────────────────────────────────────
  ["dev-tx-047", dateDaysAgo(45), null, "expense", 4200, "JPY", "doctor", "jpy-cash", null, "jpy-cash", null, null, 1, 1, "测试：诊所"],
  ["dev-tx-048", dateDaysAgo(11), null, "expense", 1800, "JPY", "entertainment", "paypay", null, "paypay", null, null, 1, 1, "测试：电影"],
  ["dev-tx-049", dateDaysAgo(30), null, "expense", 6800, "JPY", "gift", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：朋友生日礼物"],
  ["dev-tx-050", dateDaysAgo(60), null, "expense", 220, "JPY", "fees-tax", "jp-bank-main", null, "jp-bank-transfer", null, null, 1, 1, "测试：ATM 手续费"],

  // ── 旅行（一次小旅行：上月去关西）──────────────────────────────────
  ["dev-tx-051", dateDaysAgo(48), null, "expense", 24800, "JPY", "travel-accommodation", "jpy-credit-card-a", null, "credit-card-a", null, null, 1, 1, "测试：关西旅行 民宿"],
  ["dev-tx-052", dateDaysAgo(47), null, "expense", 3680, "JPY", "travel-food", "paypay", null, "paypay", null, null, 1, 1, "测试：关西旅行 餐食"],
  ["dev-tx-053", dateDaysAgo(46), null, "expense", 4200, "JPY", "travel-food", "paypay", null, "paypay", null, null, 1, 1, "测试：关西旅行 餐食"],

  // ── CNY 测试数据 ───────────────────────────────────────────────────
  ["dev-tx-054", dateDaysAgo(9), null, "expense", 8800, "CNY", "dining", "alipay-balance", null, "alipay", null, null, 1, 1, "测试：聚餐 AA"],
  ["dev-tx-055", dateDaysAgo(13), null, "expense", 1560, "CNY", "snacks", "wechat-balance", null, "wechat-pay", null, null, 1, 1, "测试：奶茶 + 点心"],
  ["dev-tx-056", dateDaysAgo(6), null, "expense", 3400, "CNY", "transport", "wechat-balance", null, "wechat-pay", null, null, 1, 1, "测试：打车"],
  ["dev-tx-057", dateDaysAgo(20), null, "expense", 28000, "CNY", "gift", "alipay-balance", null, "alipay", null, null, 1, 1, "测试：亲戚红包"],
  ["dev-tx-058", dateDaysAgo(36), null, "income", 1800000, "CNY", "income-salary", null, "cny-bank-main", "cny-bank-transfer", null, null, 1, 1, "测试：上月人民币工资"],
];

const SQL_ACCOUNT = `
  insert into accounts (id, owner_user_id, name, type, currency, balance_minor, include_in_net_worth, note, last_digits, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id,
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
  insert into payment_methods (id, owner_user_id, name, type, currency, default_account_id, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id,
    name = excluded.name,
    type = excluded.type,
    currency = excluded.currency,
    default_account_id = excluded.default_account_id,
    updated_at = excluded.updated_at
`;

const SQL_QUICK_ENTRY = `
  insert into quick_entry_templates (
    id, owner_user_id, name, type, currency, amount_minor, category_id,
    source_account_id, target_account_id, payment_method_id,
    note, sort_order, enabled, created_at, updated_at
  )
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id,
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
  insert into credit_cards (id, owner_user_id, account_id, closing_day, payment_day, repayment_account_id, enabled, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id,
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
    id, owner_user_id, occurred_on, posted_on, type, amount_minor, currency,
    category_id, source_account_id, target_account_id, payment_method_id,
    recurring_item_id, refund_tracker_id, include_in_expense_stats,
    include_in_cashflow_stats, note, created_at, updated_at
  )
  values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    owner_user_id = excluded.owner_user_id,
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
  ...accounts.map((row) => ({
    sql: SQL_ACCOUNT,
    args: [row[0], ownerUserId, ...row.slice(1), now, now],
  })),
  ...paymentMethods.map((row) => ({
    sql: SQL_PAYMENT_METHOD,
    args: [row[0], ownerUserId, ...row.slice(1), now, now],
  })),
  ...quickEntryTemplates.map((row) => ({
    sql: SQL_QUICK_ENTRY,
    args: [row[0], ownerUserId, ...row.slice(1), now, now],
  })),
  ...creditCards.map((row) => ({
    sql: SQL_CREDIT_CARD,
    args: [row[0], ownerUserId, ...row.slice(1), now, now],
  })),
  ...exchangeRates.map((row) => ({ sql: SQL_EXCHANGE_RATE, args: [...row, now] })),
  ...transactions.map((row) => ({
    sql: SQL_TRANSACTION,
    args: [row[0], ownerUserId, ...row.slice(1), now, now],
  })),
];

await client.batch(statements, "deferred");

// seed 用 raw SQL 直插 transactions，绕过了 service 层的 applyCategoryUsageDelta，
// 导致 categories.usage_count 和 last_used_at 始终是 0/NULL。
// 这里按真实交易数据重算一次，让分类排序（CategoryPicker / lookups）开箱即用。
await client.execute({
  sql: `
    update categories
    set usage_count = (
      select count(*) from transactions where transactions.category_id = categories.id
    ),
    last_used_at = (
      select max(occurred_on) from transactions where transactions.category_id = categories.id
    ),
    updated_at = ?
  `,
  args: [now],
});

client.close();

const target = url.startsWith("file:") ? url.slice("file:".length).split("?")[0] : url;
console.log(`Seeded FlowLedger development data into ${target}`);
