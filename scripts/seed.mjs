import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";

const defaultUrl = "file:./data/flowledger.db";
const url = process.env.DATABASE_URL ?? defaultUrl;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (url.startsWith("file:")) {
  const filePath = url.slice("file:".length).split("?")[0];
  if (filePath) mkdirSync(dirname(filePath), { recursive: true });
}

const client = createClient({ url, authToken });

if (url.startsWith("file:")) {
  await client.execute("PRAGMA foreign_keys = ON");
}

const now = new Date().toISOString();

const categories = [
  ["housing", "居住", null, "housing"],
  ["rent", "房租", "housing", null],
  ["water", "水", "housing", null],
  ["electricity", "电", "housing", null],
  ["gas", "燃气", "housing", null],
  ["internet", "网络", "housing", null],
  ["grocery", "食材", null, "grocery"],
  ["vagetables", "蔬菜", "grocery", null],
  ["fruits", "水果", "grocery", null],
  ["meat", "肉类", "grocery", null],
  ["seafood", "海鲜", "grocery", null],
  ["snacks", "零食", "grocery", null],
  ["beverages", "饮料", "grocery", null],
  ["alcohol", "酒", "grocery", null],
  ["milk", "乳制品", "grocery", null],
  ["dining", "外食", null, "dining"],
  ["ready-meal", "简餐", "dining", null],
  ["coffee", "咖啡", "dining", "coffee"],
  ["daily-goods", "日用品", null, "daily-goods"],
  ["paper-towels", "厨房纸", "daily-goods", null],
  ["tissues", "面巾纸", "daily-goods", null],
  ["toilet-paper", "卷纸", "daily-goods", null],
  ["toothpaste", "牙膏", "daily-goods", null],
  ["shampoo", "洗发水", "daily-goods", null],
  ["beauty", "美妆护肤", null, "beauty"],
  ["skincare", "护肤品", "beauty", null],
  ["makeup", "彩妆", "beauty", null],
  ["face-wash", "洗面奶", "beauty", null],
  ["electronics", "电子产品", null, "electronics"],
  ["clothing", "服饰", null, "clothing"],
  ["transport", "交通", null, "transport"],
  ["game", "游戏", null, "game"],
  ["genshin-impact", "原神", "game", null],
  ["zenless-zone-zero", "绝区零", "game", null],
  ["ps5-software", "PS5 实体游戏", "game", null],
  ["other-game", "其他游戏", "game", null],
  ["subscription", "订阅", null, "subscription"],
  ["iCloud", "iCloud", "subscription", null],
  ["medical", "医疗", null, "medical"],
  ["medicine", "药品", "medical", null],
  ["doctor", "医生", "medical", null],
  ["entertainment", "社交娱乐", null, "entertainment"],
  ["travel", "旅行", null, "travel"],
  ["travel-transportation", "旅行交通", "travel", null],
  ["travel-accommodation", "旅行住宿", "travel", null],
  ["travel-food", "旅行饮食", "travel", null],
  ["gift", "礼物", null, "gift"],
  ["fees-tax", "手续费和税费", null, "fees-tax"],
  ["income-salary", "工资", null, "income"],
  ["refund", "退款", null, "refund"],
  ["other", "其他", null, "other"],
];

const SQL_CATEGORY = `
  insert into categories (id, name, parent_id, icon_key, created_at, updated_at)
  values (?, ?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    parent_id = excluded.parent_id,
    icon_key = excluded.icon_key,
    updated_at = excluded.updated_at
`;

const statements = categories.map((row) => ({ sql: SQL_CATEGORY, args: [...row, now, now] }));

await client.batch(statements, "deferred");
client.close();

const target = url.startsWith("file:") ? url.slice("file:".length).split("?")[0] : url;
console.log(`Seeded FlowLedger default categories into ${target}`);
