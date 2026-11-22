import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Fast cookie check only; the real session check happens in /api/data on every read/write.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = !!getSessionCookie(req);
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!signedIn && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (signedIn && (pathname === "/login" || pathname === "/signup")) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icon.svg|icon|manifest.webmanifest|favicon.ico).*)"],
};
