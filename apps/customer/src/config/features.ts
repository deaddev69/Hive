// apps/customer/src/config/features.ts
/**
 * Customer capability feature flags.
 * Used to conditionally gate customer-facing capabilities without modifying backend/schema models.
 */
export const CUSTOMER_FEATURES = {
  /**
   * Initial launch: returns-only.
   * Flip to true to roll out customer-facing size exchanges, exchange credit, and exchange actions.
   */
  EXCHANGES_ENABLED: false,
} as const;
