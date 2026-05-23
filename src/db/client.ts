import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const defaultLocalUrl = "file:./data/flowledger.db";

/**
 * 解析 DATABASE_URL：
 * - 本地：以 "file:" 开头，指向本地 .db 文件，自动创建父目录、启 WAL + 外键约束
 * - Turso：libsql://... 配合 DATABASE_AUTH_TOKEN
 */
function resolveDatabaseConfig() {
  const url = process.env.DATABASE_URL ?? defaultLocalUrl;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (url.startsWith("file:")) {
    // 本地：补全父目录
    const filePath = url.slice("file:".length).split("?")[0];
    if (filePath) {
      mkdirSync(dirname(filePath), { recursive: true });
    }
  }

  return { url, authToken };
}

const { url, authToken } = resolveDatabaseConfig();
const client = createClient({ url, authToken });

// 本地文件模式开启 WAL + 外键；Turso 远程模式跳过（这些是 SQLite-only pragma）
if (url.startsWith("file:")) {
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
}

export const db = drizzle(client, { schema });
