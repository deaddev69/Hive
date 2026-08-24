import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
  requestHeaders.set("x-hive-portal", "admin");

  // 1. Admin edge auth protection
  const isAuthPath = pathname.includes("/sign-in") || pathname.includes("/sign-up") || pathname.includes("/unauthorized");

  if (!isAuthPath) {
    const session = await auth.protect();
    const userRole = session.sessionClaims?.metadata?.role || session.sessionClaims?.role;
    if (userRole && userRole !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  // 2. Rewrite path internally to /admin/ if it doesn't already have it
  // Ignore auth paths so they route directly to root /sign-in and /sign-up
  if (!isAuthPath) {
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      });
    } else if (pathname !== "/admin" && !pathname.startsWith("/admin/")) {
      url.pathname = `/admin${pathname}`;
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
