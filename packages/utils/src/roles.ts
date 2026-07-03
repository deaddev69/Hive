export type UserRole = "admin" | "boutique" | "boutique_owner" | "seller_pending" | "seller_rejected" | "customer";

export function getUserLandingPage(role?: UserRole | string): string {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "boutique" || role === "boutique_owner") {
    return "/seller";
  }
  // Seller pending/rejected users access Seller Center for onboarding status
  if (role === "seller_pending" || role === "seller_rejected") {
    return "/seller";
  }
  // Customers belong on the customer app, not the admin panel
  const customerAppUrl = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CUSTOMER_APP_URL
    ? process.env.NEXT_PUBLIC_CUSTOMER_APP_URL
    : "http://localhost:3000";
  return `${customerAppUrl}/`;
}

