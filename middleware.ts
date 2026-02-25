import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/auth";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  // Handle /management routes independently (bypassing next-intl)
  if (pathname.startsWith("/management")) {
    const isAuthRoute = pathname === "/management/auth";

    if (isAuthRoute && session?.role === "superadmin") {
      return NextResponse.redirect(new URL("/management/tenants", request.nextUrl));
    }

    if (!isAuthRoute && (!session || session.role !== "superadmin")) {
      return NextResponse.redirect(new URL("/management/auth", request.nextUrl));
    }

    return NextResponse.next();
  }

  const protectedRoutes = ["/dashboard", "/accounting", "/admin"];
  const publicRoutes = ["/auth"];

  // Run next-intl middleware for normal localized app routes
  const response = intlMiddleware(request);

  // Extract the locale from the request path if present
  // This assumes the locale is the first segment after /
  const segments = pathname.split("/");
  const locale = segments[1];

  // Adjust path check to ignore locale prefix for protected/public route checks
  // If the path starts with a locale, strip it for checking against route lists
  let pathToCheck = pathname;
  if (["en", "id"].includes(locale)) {
    pathToCheck = `/${segments.slice(2).join("/")}`;
    // Ensure root path handling after stripping locale
    if (pathToCheck === "") pathToCheck = "/";
  }

  // Check if the current path is a protected route
  const isProtectedRoute =
    protectedRoutes.some((route) =>
      pathToCheck.startsWith(route)
    );

  const isPublicRoute = publicRoutes.some((route) =>
    pathToCheck.startsWith(route)
  );

  // 1. Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session?.userId) {
    if (!["en", "id"].includes(locale)) {
      // If locale is missing (e.g. root /), let intlMiddleware redirect it first
      return response;
    }
    // Redirect to /auth, preserving the locale
    const loginUrl = new URL(`/${locale}/auth`, request.nextUrl);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect to /dashboard if the user is authenticated and trying to access a public route (like login)
  if (isPublicRoute && session?.userId) {
    if (!["en", "id"].includes(locale)) {
      return response;
    }
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.nextUrl);
    return NextResponse.redirect(dashboardUrl);
  }

  // 3. Redirect to /dashboard if the user is authenticated and trying to access the root marketing page
  if (pathToCheck === "/" && session?.userId) {
    if (!["en", "id"].includes(locale)) {
      return response;
    }
    const dashboardUrl = new URL(`/${locale}/dashboard`, request.nextUrl);
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
