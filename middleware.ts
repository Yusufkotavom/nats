import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/auth";
import createMiddleware from "next-intl/middleware";

const intlMiddleware = createMiddleware({
  locales: ["en", "id"],
  defaultLocale: "en",
});

export async function middleware(request: NextRequest) {
  const protectedRoutes = ["/dashboard", "/accounting", "/admin"];
  const publicRoutes = ["/auth"];

  // Run next-intl middleware first to handle redirects and locale detection
  const response = intlMiddleware(request);

  // Extract the locale from the request path if present
  // This assumes the locale is the first segment after /
  const pathname = request.nextUrl.pathname;
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
    ) || pathToCheck === "/"; // Root is also protected usually

  const isPublicRoute = publicRoutes.some((route) =>
    pathToCheck.startsWith(route)
  );

  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  // 1. Redirect to /login if the user is not authenticated and trying to access a protected route
  if (isProtectedRoute && !session?.userId) {
    // Redirect to /auth, preserving the locale
    const loginUrl = new URL(`/${locale}/auth`, request.nextUrl);
    // If locale is not present in URL, verify if we should default to 'en' or rely on next-intl redirect
    // But since intlMiddleware ran first, it might have already redirected if locale was missing.
    // However, if we are here, we might need to be careful.
    if (!["en", "id"].includes(locale)) {
      // If locale is missing (e.g. root /), intlMiddleware handles it. 
      // But subsequent logic might run. 
      // Actually, intlMiddleware returns a response. If it's a redirect, we should return it?
      // The standard pattern is to use intlMiddleware's response or create a new one.
    }
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirect to / (dashboard) if the user is authenticated and trying to access a public route (like login)
  if (isPublicRoute && session?.userId) {
    const dashboardUrl = new URL(`/${locale}/`, request.nextUrl);
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
