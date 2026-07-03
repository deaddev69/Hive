import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Customer app URL — environment variable in production, localhost in development
const CUSTOMER_APP_URL = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || "http://localhost:3000";

// Host lists for domain mapping
const SELLER_HOSTS = [
  "seller.hive.in",
  "merchant.hive.in",
  "partners.hive.in",
  "seller.localhost:3001",
  "merchant.localhost:3001",
  "seller.localhost",
  "merchant.localhost",
];

const ADMIN_HOSTS = [
  "admin.hive.in",
  "admin.localhost:3001",
  "admin.localhost",
];

export default clerkMiddleware(async (auth, req) => {
  const host = req.headers.get("host") || "";
  const url = req.nextUrl.clone();
  const { pathname } = url;

  // Skip Next.js internals, static assets, and api/trpc routes
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

  const isSellerHost = SELLER_HOSTS.includes(host) || host.startsWith("seller.") || host.startsWith("merchant.") || host.startsWith("partners.");
  const isAdminHost = ADMIN_HOSTS.includes(host) || host.startsWith("admin.");

  // Determine portal type for layout personalization
  let portal = "root";
  if (isAdminHost || pathname.startsWith("/admin")) {
    portal = "admin";
  } else if (isSellerHost || pathname.startsWith("/seller") || pathname.startsWith("/boutique")) {
    portal = "seller";
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-hive-portal", portal);

  // 1. Admin/Seller edge auth protection
  const isAuthPath = pathname.includes("/sign-in") || pathname.includes("/sign-up");
  const isInvitePath = pathname.startsWith("/seller/invite") || pathname.startsWith("/invite") || pathname.startsWith("/apply");

  if (!isAuthPath && !isInvitePath) {
    if (isAdminHost || pathname.startsWith("/admin")) {
      await auth.protect();
    } else if (isSellerHost || pathname.startsWith("/seller") || pathname.startsWith("/boutique")) {
      await auth.protect();
    }
  }

  // 2. Admin Console Subdomain Isolation
  if (isAdminHost) {
    // Hard 404 on any boutique/seller paths accessed via admin subdomain
    if (pathname === "/seller" || pathname.startsWith("/seller/")) {
      return new NextResponse(null, { status: 404 });
    }
    // Rewrite path internally to /admin/ if it doesn't already have it
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
  }

  // 2. Seller Center Subdomain Isolation
  else if (isSellerHost) {
    // Hard 404 on any admin paths accessed via seller subdomain
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return new NextResponse(null, { status: 404 });
    }
    // Redirect merchant onboarding applications to customer app portal
    if (pathname === "/apply") {
      return NextResponse.redirect(`${CUSTOMER_APP_URL}/become-seller`, 302);
    }
    // Rewrite path internally to /boutique/ if it doesn't already have it
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

