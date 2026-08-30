// apps/boutique/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Customer app URL — environment variable in production, localhost in development
const CUSTOMER_APP_URL = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || "https://hivenow.in";

/**
 * Lean middleware — no Clerk edge auth.
 * Firebase auth tokens are validated client-side by Convex (not edge-readable).
 * This middleware handles only path rewrites, redirects, and portal headers.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals, static assets, api/trpc routes, and Server Actions
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.includes(".") ||
    isServerAction
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hive-portal", "seller");

  // Redirect merchant onboarding applications to customer app portal
  if (pathname === "/apply") {
    return NextResponse.redirect(`${CUSTOMER_APP_URL}/become-seller`, 302);
  }

  const isAuthPath =
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/oauth") ||
    pathname.startsWith("/callback");

  const isPublicPath =
    pathname.startsWith("/invite") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/unauthorized") ||
    pathname.startsWith("/boutique/unauthorized");

  // Rewrite path internally to /boutique/ if it doesn't already have it
  // Ignore auth paths and public paths so they route directly
  if (!isAuthPath && !isPublicPath) {
    const url = request.nextUrl.clone();
    if (pathname === "/") {
      url.pathname = "/boutique";
      return NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
    } else if (pathname !== "/boutique" && !pathname.startsWith("/boutique/")) {
      url.pathname = `/boutique${pathname}`;
      return NextResponse.rewrite(url, {
        request: { headers: requestHeaders },
      });
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    // Ignore Next.js internals, static files, and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
