import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "flowledger_session";
const SESSION_TTL_DAYS = 30;

export type FlowLedgerUser = {
  id: string;
  name: string;
  password: string;
};

export type PublicFlowLedgerUser = Omit<FlowLedgerUser, "password">;

export function getConfiguredUsers(): FlowLedgerUser[] {
  const raw = process.env.FLOWLEDGER_USERS_JSON;
  if (!raw) {
    throw new Error(
      'FLOWLEDGER_USERS_JSON is not set. Add a JSON array like [{"id":"zhang","name":"zhang","password":"..."}] to .env.local or production environment variables.',
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FLOWLEDGER_USERS_JSON must be valid JSON.");
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("FLOWLEDGER_USERS_JSON must be a non-empty JSON array.");
  }

  const ids = new Set<string>();
  return parsed.map((item, index) => {
    if (!isUserConfig(item)) {
      throw new Error(
        `FLOWLEDGER_USERS_JSON item ${index + 1} must include string id, name, and password.`,
      );
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(item.id)) {
      throw new Error(`FLOWLEDGER_USERS_JSON user id "${item.id}" contains invalid characters.`);
    }
    if (ids.has(item.id)) {
      throw new Error(`FLOWLEDGER_USERS_JSON contains duplicate user id "${item.id}".`);
    }
    ids.add(item.id);
    return item;
  });
}

export function getPublicUsers(): PublicFlowLedgerUser[] {
  return getConfiguredUsers().map(({ id, name }) => ({ id, name }));
}

export function findConfiguredUser(id: string): FlowLedgerUser | null {
  return getConfiguredUsers().find((user) => user.id === id) ?? null;
}

async function getSecret(): Promise<Uint8Array> {
  const raw = process.env.FLOWLEDGER_USERS_JSON;
  if (!raw) getConfiguredUsers();

  // 从密码派生 32 字节 secret（SHA-256），不需要单独维护 SESSION_SECRET。
  // 改用户配置或密码 → 旧 session 自动失效。
  const input = new TextEncoder().encode(`flowledger-session:${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return new Uint8Array(digest);
}

export async function createSessionToken(userId: string): Promise<string> {
  const secret = await getSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const secret = await getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return findConfiguredUser(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<PublicFlowLedgerUser> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const userId = token ? await verifySessionToken(token) : null;
  if (!userId) throw new Error("Not authenticated.");
  const user = findConfiguredUser(userId);
  if (!user) throw new Error("Authenticated user is not configured.");
  return { id: user.id, name: user.name };
}

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}

function isUserConfig(value: unknown): value is FlowLedgerUser {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    record.name.length > 0 &&
    typeof record.password === "string" &&
    record.password.length > 0
  );
}
