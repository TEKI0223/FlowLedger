import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export async function proxy(req: NextRequest) {
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
  // 排除：API、Next.js 内部资源、PWA 图标/启动图、favicon、manifest。其他全部经过 middleware。
  matcher: ["/((?!api|_next/static|_next/image|icons|splash|favicon.ico|manifest.webmanifest).*)"],
};
