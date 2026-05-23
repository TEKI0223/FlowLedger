import { NextResponse, type NextRequest } from "next/server";
import { isAuthEnabled, SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  // 没设密码 → 完全透传（开发期默认状态）
  if (!isAuthEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySessionToken(token))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") {
    url.searchParams.set("from", pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // 排除静态资源 / Next.js 内部 / favicon / manifest，其余都受密码保护。
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.png|.*\\.svg).*)"],
};
