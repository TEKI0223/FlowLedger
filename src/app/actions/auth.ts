"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, findConfiguredUser, SESSION_COOKIE } from "@/lib/auth";

export type LoginActionState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const password = formData.get("password");
  const userId = formData.get("userId");
  const from = (formData.get("from") as string | null) ?? "/";

  if (typeof userId !== "string" || userId.length === 0) {
    return { error: "请选择用户" };
  }

  if (typeof password !== "string" || password.length === 0) {
    return { error: "请输入密码" };
  }

  const user = findConfiguredUser(userId);
  if (!user) return { error: "用户不存在" };

  if (!timingSafeEqual(password, user.password)) {
    return { error: "密码不正确" };
  }

  const token = await createSessionToken(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // 根据实际请求协议决定，而不是 NODE_ENV。
    // 局域网用 HTTP 访问生产构建时，Secure 标志会让浏览器直接拒收 cookie，
    // 表现为每次请求都要重新登录。
    secure: await isHttpsRequest(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from || "/");
}

/**
 * 判断当前请求是否走的 HTTPS：
 * - x-forwarded-proto（Vercel / 反向代理）优先
 * - 没有反代头时，认为是直接 HTTP 连接（局域网开发场景）
 */
async function isHttpsRequest(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto");
    if (proto) return proto.split(",")[0].trim() === "https";
    return false;
  } catch {
    return false;
  }
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

/** 简单的 timing-safe 比较，避免按字符提前返回。 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
