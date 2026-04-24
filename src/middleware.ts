import { NextRequest, NextResponse } from "next/server";

// Paths that never require Firebase auth
const PUBLIC_PREFIXES = [
  "/auth",
  "/api/stripe/webhook",
  "/api/homeowner",
  "/api/weather",
  "/api/chemistry/analyze",
  "/api/portal",
  "/homeowner",
  "/customers/portal",
  "/pool-service-software",
  "/_next",
  "/favicon",
  "/manifest",
  "/icon",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Root landing page is public
  if (pathname === "/") return NextResponse.next();

  const session = req.cookies.get("__session")?.value;
  if (!session) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
