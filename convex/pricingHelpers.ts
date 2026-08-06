// Re-export all pricing service functionality for backward compatibility
export {
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
