import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/auth";

export async function middleware(request: NextRequest) {
  const protectedRoutes = ["/dashboard", "/accounting", "/admin"];
  const publicRoutes = ["/auth"];

  // Check if the current path is a protected route
  const isProtectedRoute =
    protectedRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    ) || request.nextUrl.pathname === "/"; // Root is also protected usually

  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  // 1. Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL("/auth", request.nextUrl));
  }

  // 2. Redirect to / (dashboard) if the user is authenticated and trying to access a public route (like login)
  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (svg, etc.)
     *
     * Note: API routes are NO LONGER excluded from middleware to ensure security.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
