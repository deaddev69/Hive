import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// All routes in the admin app are handled by layout-level auth guards.
// We do NOT use middleware-level protection here so that:
//   1. /sign-in and /sign-up always render (no auth needed)
//   2. /admin and /boutique layouts handle their own role checks via useQuery(getMe)
//
// IMPORTANT: clerkMiddleware() MUST be exported even if it does nothing.
// Without it, Clerk v5+ cannot inject the auth state and every page hangs.

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
]);

export default clerkMiddleware(async (auth, req) => {
  // All routes are public — layout components handle role-based guards.
  // Do nothing here; just let clerkMiddleware inject the auth token.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
