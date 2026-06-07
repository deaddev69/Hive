export type UserRole = "admin" | "boutique" | "boutique_owner" | "customer";

export function getUserLandingPage(role?: UserRole | string): string {
  if (role === "admin") {
    return "/admin";
  }
  if (role === "boutique" || role === "boutique_owner") {
    return "/boutique";
  }
  // Customers belong on the customer app, not the admin panel
  return "http://localhost:3000/";
}
