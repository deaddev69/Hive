export {};

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: "admin" | "boutique" | "boutique_owner" | "customer";
      boutiqueId?: string;
    };
    role?: "admin" | "boutique" | "boutique_owner" | "customer";
  }
}
