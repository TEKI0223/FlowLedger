import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

const defaultDatabaseUrl = "./data/flowledger.db";

function normalizeDatabasePath(databaseUrl: string): string {
  const withoutQuery = databaseUrl.split("?")[0] ?? databaseUrl;

  if (withoutQuery.startsWith("file:")) {
    return withoutQuery.slice("file:".length);
  }

  return withoutQuery;
}

const databasePath = normalizeDatabasePath(process.env.DATABASE_URL ?? defaultDatabaseUrl);

mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
