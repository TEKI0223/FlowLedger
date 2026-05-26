"use server";

import { cookies } from "next/headers";
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(from || "/");
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
