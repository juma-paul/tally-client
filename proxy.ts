import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const proxy = (request: NextRequest) => {
  // Check for auth cookies
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const isAuthenticated = !!(accessToken && refreshToken);

  const pathname = request.nextUrl.pathname;

  // Define routes
  const protectedRoutes = ["/dashboard", "/settings"];
  const authRoutes = ["/auth"];

  // Protected Routes: redirect to login if not authenticated
  if (
    protectedRoutes.some((route) => pathname.startsWith(route)) &&
    !isAuthenticated
  ) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Public Auth Routes: redirect to dashboard if authenticated
  if (
    authRoutes.some((route) => pathname.startsWith(route)) &&
    isAuthenticated
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Allow all other routes
  return NextResponse.next();
};

export const config = {
  matcher: [
    // Protected routes
    "/dashboard/:path*",
    "/settings/:path*",

    // Auth routes
    "/auth/:path*",
  ],
};
