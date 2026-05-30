import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];
const VIEW_COOKIE = "view";
const MOBILE_UA = /Mobi|Android|iPhone|iPod/i;

function detectIsPC(req: NextRequest): boolean {
  const override = req.cookies.get(VIEW_COOKIE)?.value;
  if (override === "pc") return true;
  if (override === "mobile") return false;
  const ua = req.headers.get("user-agent") ?? "";
  return !MOBILE_UA.test(ua);
}

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ?view=pc|mobile|auto -> persist preference as cookie, then redirect to clean URL
  const viewOverride = searchParams.get("view");
  if (viewOverride) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("view");
    const res = NextResponse.redirect(url);
    if (viewOverride === "pc" || viewOverride === "mobile") {
      res.cookies.set(VIEW_COOKIE, viewOverride, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
    } else if (viewOverride === "auto") {
      res.cookies.delete(VIEW_COOKIE);
    }
    return res;
  }

  // Auth gate
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (!isPublic) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token || !(await verifySessionToken(token))) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      if (pathname !== "/") {
        url.searchParams.set("from", pathname + req.nextUrl.search);
      }
      return NextResponse.redirect(url);
    }
  }

  // Device routing.
  // PC tree lives at app/pc/*. Routes listed in PC_REWRITES are served by the
  // PC version for PC users while keeping the public URL clean (no /pc/ prefix).
  // Direct visits to /pc/* are redirected to the canonical URL.
  const isPC = detectIsPC(req);

  for (const [publicPath, pcPath] of PC_REWRITES) {
    if (pathname === pcPath) {
      const url = req.nextUrl.clone();
      url.pathname = publicPath;
      return NextResponse.redirect(url);
    }
    if (isPC && pathname === publicPath) {
      const url = req.nextUrl.clone();
      url.pathname = pcPath;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

const PC_REWRITES: ReadonlyArray<readonly [publicPath: string, pcPath: string]> = [
  ["/", "/pc"],
  ["/transactions", "/pc/transactions"],
];

export const config = {
  // Exclude: API, Next internals, PWA assets, favicon, manifest.
  matcher: ["/((?!api|_next/static|_next/image|icons|splash|favicon.ico|manifest.webmanifest).*)"],
};
