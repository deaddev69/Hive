// Re-export all pricing service functionality for backward compatibility
export {
  // v2 API
  getPlatformConfig,
  resolveCommissionTier,
  calculateSellerItemPricing,
  calculateCheckoutPricing,
  // Legacy v1 API (deprecated but still used by some code paths)
  selectMarkupRate as getPlatformMarkupRate,
  selectMarkupRate,
  calculateProductPricing,
  calculateItemFinancials,
  calculateBoutiquePayout,
  calculateStoreSettlement,
  calculateOrderTotals,
  calculateInvoiceFinancials,
  calculateBoutiqueEarnings,
  getPlatformSettings,
} from "./pricingService";
