import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("aria-auth");

  // If public route, check if authenticated
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Direct homepage path handling
  if (pathname === "/" || pathname === "/auth") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect to login if unauthenticated on protected pages
  if (!token && (pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname.startsWith("/onboarding"))) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
