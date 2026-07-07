import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/checkout(.*)",
  "/orders(.*)",
  "/order(.*)",
  "/account(.*)"
]);

const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Redirect signed-in users away from auth pages to prevent Clerk warnings
  if (userId && isAuthRoute(req)) {
    return Response.redirect(new URL("/", req.url));
  }

  if (isProtectedRoute(req)) {
    if (!userId) {
      // Hardcode or extract your auth domain. Assuming accounts.hivenow.in based on user prompt.
      const signInUrl = new URL("https://accounts.hivenow.in/sign-in");
      signInUrl.searchParams.set("redirect_url", req.url);

      const isNextDataRequest = 
        req.headers.get("x-next-js-data") || 
        req.headers.get("purpose") === "prefetch" ||
        req.nextUrl.searchParams.has("_rsc");

      if (isNextDataRequest) {
        return new Response(JSON.stringify({ redirect: signInUrl.toString() }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      return Response.redirect(signInUrl);
    }
    
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except static assets and internal Next.js paths
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
