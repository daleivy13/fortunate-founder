import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth", "/api/stripe/webhook"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths and static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icon")
  ) {
    return NextResponse.next();
  }

  // Check for Firebase session cookie
  const session = req.cookies.get("__session")?.value;

  if (!session && pathname !== "/") {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
