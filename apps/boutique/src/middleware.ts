import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Customer app URL — environment variable in production, localhost in development
const CUSTOMER_APP_URL = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || "http://localhost:3000";

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Skip Next.js internals, static assets, api/trpc routes, and Server Actions
  const isServerAction = req.method === "POST" && req.headers.has("next-action");
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/trpc") ||
    pathname.includes(".") ||
    isServerAction
  ) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-hive-portal", "seller");

  // 1. Seller edge auth protection
  const isAuthPath = pathname.includes("/sign-in") || pathname.includes("/sign-up");
  const isInvitePath = pathname.startsWith("/seller/invite") || pathname.startsWith("/invite") || pathname.startsWith("/apply");

  if (!isAuthPath && !isInvitePath) {
    const session = await auth.protect();
    const userRole = session.sessionClaims?.metadata?.role || session.sessionClaims?.role;
    if (userRole && userRole !== "boutique" && userRole !== "boutique_owner" && userRole !== "admin") {
      return NextResponse.redirect(new URL(CUSTOMER_APP_URL, req.url));
    }
  }

  // 2. Redirect merchant onboarding applications to customer app portal
  if (pathname === "/apply") {
    return NextResponse.redirect(`${CUSTOMER_APP_URL}/become-seller`, 302);
  }

  // 3. Rewrite path internally to /boutique/ if it doesn't already have it
  // Ignore auth paths so they route directly to root /sign-in and /sign-up
  if (!isAuthPath) {
    if (pathname === "/") {
      url.pathname = "/boutique";
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    } else if (pathname !== "/boutique" && !pathname.startsWith("/boutique/")) {
      url.pathname = `/boutique${pathname}`;
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Ignore Next.js internals, static files, and images
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
