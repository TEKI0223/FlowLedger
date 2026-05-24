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
  ["housing", "居住", null],
  ["rent", "房租", "housing"],
  ["water", "水", "housing"],
  ["electricity", "电", "housing"],
  ["gas", "燃气", "housing"],
  ["internet", "网络", "housing"],
  ["game", "游戏", null],
  ["genshin-impact", "原神", "game"],
  ["zenless-zone-zero", "绝区零", "game"],
  ["ps5-software", "PS5 实体游戏", "game"],
  ["other-game", "其他游戏", "game"],
  ["food", "饮食", null],
  ["grocery", "超市", "food"],
  ["vagetables", "蔬菜", "grocery"],
  ["fruits", "水果", "grocery"],
  ["meat", "肉类", "grocery"],
  ["seafood", "海鲜", "grocery"],
  ["snacks", "零食", "grocery"],
  ["beverages", "饮料", "grocery"],
  ["alcohol", "酒", "grocery"],
  ["milk", "乳制品", "grocery"],
  ["convenience-store", "便利店", "food"],
  ["dining", "外食", "food"],
  ["coffee", "咖啡", "food"],
  ["transport", "交通", null],
  ["shopping", "购物", null],
  ["daily-goods", "日用品", "shopping"],
  ["electronics", "电子产品", "shopping"],
  ["clothing", "服饰", "shopping"],
  ["paper-towels", "厨房纸", "daily-goods"],
  ["tissues", "面巾纸", "daily-goods"],
  ["toilet-paper", "卷纸", "daily-goods"],
  ["toothpaste", "牙膏", "daily-goods"],
  ["shampoo", "洗发水", "daily-goods"],
  ["skincare", "护肤品", "daily-goods"],
  ["makeup", "彩妆", "daily-goods"],
  ["face-wash", "洗面奶", "daily-goods"],
  ["subscription", "订阅", null],
  ["iCloud", "iCloud", "subscription"],
  ["medical", "医疗", null],
  ["medicine", "药品", "medical"],
  ["doctor", "医生", "medical"],
  ["entertainment", "社交娱乐", null],
  ["travel", "旅行", null],
  ["travel-transportation", "旅行交通", "travel"],
  ["travel-accommodation", "旅行住宿", "travel"],
  ["travel-food", "旅行饮食", "travel"],
  ["gift", "礼物", null],
  ["fees-tax", "手续费和税费", null],
  ["income-salary", "工资", null],
  ["refund", "退款", null],
  ["other", "其他", null],
];

const SQL_CATEGORY = `
  insert into categories (id, name, parent_id, created_at, updated_at)
  values (?, ?, ?, ?, ?)
  on conflict(id) do update set
    name = excluded.name,
    parent_id = excluded.parent_id,
    updated_at = excluded.updated_at
`;

const statements = categories.map((row) => ({ sql: SQL_CATEGORY, args: [...row, now, now] }));

await client.batch(statements, "deferred");
client.close();

const target = url.startsWith("file:") ? url.slice("file:".length).split("?")[0] : url;
console.log(`Seeded FlowLedger default categories into ${target}`);
