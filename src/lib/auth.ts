import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "flowledger_session";
const SESSION_TTL_DAYS = 30;

async function getSecret(): Promise<Uint8Array> {
  const password = process.env.FLOWLEDGER_PASSWORD;
  if (!password) {
    throw new Error(
      "FLOWLEDGER_PASSWORD is not set. The app requires a password — add it to .env.local (dev) or environment variables (production).",
    );
  }
  // 从密码派生 32 字节 secret（SHA-256），不需要单独维护 SESSION_SECRET。
  // 改密码 → 旧 session 自动失效。
  const input = new TextEncoder().encode(`flowledger-session:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return new Uint8Array(digest);
}

export async function createSessionToken(): Promise<string> {
  const secret = await getSecret();
  return new SignJWT({ sub: "flowledger" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = await getSecret();
    await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
