export type UserRole = "admin" | "boutique" | "boutique_owner" | "seller_pending" | "seller_rejected" | "customer";

export function getUserLandingPage(role?: UserRole | string): string {
  const adminAppUrl = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ADMIN_APP_URL
    ? process.env.NEXT_PUBLIC_ADMIN_APP_URL
    : "http://admin.localhost:3001";
    
  const sellerAppUrl = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_SELLER_PORTAL_URL
    ? process.env.NEXT_PUBLIC_SELLER_PORTAL_URL
    : "http://seller.localhost:3002";

  const customerAppUrl = typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CUSTOMER_APP_URL
    ? process.env.NEXT_PUBLIC_CUSTOMER_APP_URL
    : "http://localhost:3000";

  if (role === "admin") {
    return adminAppUrl;
  }
  
  if (
    role === "boutique" || 
    role === "boutique_owner" || 
    role === "seller_pending" || 
    role === "seller_rejected"
  ) {
    return sellerAppUrl;
  }

  // Customers belong on the customer app
  return `${customerAppUrl}/`;
}

