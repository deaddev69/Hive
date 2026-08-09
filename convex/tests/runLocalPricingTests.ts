import { calculateProductPricing, DEFAULT_TIER_SLABS } from "../pricingService";

async function run() {
  console.log("=== STARTING LOCAL HIVE ALL-IN PRICING ENGINE TESTS ===");

  const platformSettings = {
    markupRate: 0.15,
    platformFeeRate: 0.02,
    markupType: "tiered" as const,
    markupTiers: DEFAULT_TIER_SLABS,
  };

  // Test A: Base Price ₹899
  console.log("Running Test A: Base Price ₹899...");
  const pricingA = calculateProductPricing(899, null, platformSettings);
  
  // Manual verification calculation:
  // Base: 899
  // Markup tier for 899 is 16%. Markup: 899 * 0.16 = 143.84
  // Pre-GST price: 899 + 143.84 + 7 = 1049.84
  // Seller processing fee (2%): 899 * 0.02 = 17.98
  // Platform revenue base: 143.84 + 17.98 + 7 = 168.82
  // GST (18% on platform revenue): 168.82 * 0.18 = 30.3876
  // All-in raw price: 1049.84 + 30.3876 = 1080.2276
  // Charm rounded: Math.ceil(1080.2276 / 10) * 10 - 1 = 1089
  console.log(`Base Price: ₹899`);
  console.log(`Markup: ₹${pricingA.markupAmount.toFixed(2)} (${(pricingA.markupRate * 100).toFixed(0)}%)`);
  console.log(`Platform Fee: ₹${pricingA.platformFeeAmount.toFixed(2)}`);
  console.log(`Seller processing fee: ₹${pricingA.sellerProcessingFee.toFixed(2)}`);
  console.log(`GST (18%): ₹${pricingA.gstAmount.toFixed(2)}`);
  console.log(`Final customer price: ₹${pricingA.customerPrice}`);
  
  if (pricingA.customerPrice !== 1089) {
    throw new Error(`FAIL Test A: expected customerPrice to be 1089, got ${pricingA.customerPrice}`);
  }
  console.log("Test A Passed!\n");

  // Test B: Base Price ₹2500
  console.log("Running Test B: Base Price ₹2500...");
  const pricingB = calculateProductPricing(2500, null, platformSettings);
  // Base: 2500
  // Markup tier for 2500 is 11%. Markup: 2500 * 0.11 = 275
  // Pre-GST price: 2500 + 275 + 7 = 2782
  // Seller processing fee (2%): 2500 * 0.02 = 50
  // Platform revenue base: 275 + 50 + 7 = 332
  // GST (18% on platform revenue): 332 * 0.18 = 59.76
  // All-in raw price: 2782 + 59.76 = 2841.76
  // Charm rounded: Math.ceil(2841.76 / 10) * 10 - 1 = 2849
  console.log(`Base Price: ₹2500`);
  console.log(`Markup: ₹${pricingB.markupAmount.toFixed(2)} (${(pricingB.markupRate * 100).toFixed(0)}%)`);
  console.log(`Platform Fee: ₹${pricingB.platformFeeAmount.toFixed(2)}`);
  console.log(`Seller processing fee: ₹${pricingB.sellerProcessingFee.toFixed(2)}`);
  console.log(`GST (18%): ₹${pricingB.gstAmount.toFixed(2)}`);
  console.log(`Final customer price: ₹${pricingB.customerPrice}`);
  if (pricingB.customerPrice !== 2849) {
    throw new Error(`FAIL Test B: expected customerPrice to be 2849, got ${pricingB.customerPrice}`);
  }
  console.log("Test B Passed!\n");

  console.log("=== ALL LOCAL PRICING INTEGRITY TESTS PASSED ===");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
