import { calculateProductPricing, DEFAULT_TIER_SLABS } from "../pricingService";

async function run() {
  console.log("=== STARTING LOCAL HIVE ALL-IN PRICING ENGINE TESTS ===");

  const platformSettings = {
    markupRate: 0.15,
    platformFeeRate: 0.02,
    markupType: "tiered" as const,
    markupTiers: DEFAULT_TIER_SLABS,
  };

  // Test A: Base Price ₹899 (8% tier)
  console.log("Running Test A: Base Price ₹899...");
  const pricingA = calculateProductPricing(899, null, platformSettings);
  
  // Base: 899
  // Markup tier for 899 is 8%. Markup: 899 * 0.08 = 71.92
  // Pre-GST price: 899 + 71.92 + 7 = 977.92
  // Seller processing fee (2%): 899 * 0.02 = 17.98
  // Platform revenue base: 71.92 + 17.98 + 7 = 96.90
  // GST (18% on platform revenue): 96.90 * 0.18 = 17.442
  // All-in raw price: 977.92 + 17.442 = 995.362
  // Charm rounded: Math.ceil(995.362 / 10) * 10 - 1 = 999
  console.log(`Base Price: ₹899`);
  console.log(`Markup: ₹${pricingA.markupAmount.toFixed(2)} (${(pricingA.markupRate * 100).toFixed(0)}%)`);
  console.log(`Platform Fee: ₹${pricingA.platformFeeAmount.toFixed(2)}`);
  console.log(`Seller processing fee: ₹${pricingA.sellerProcessingFee.toFixed(2)}`);
  console.log(`GST (18%): ₹${pricingA.gstAmount.toFixed(2)}`);
  console.log(`Final customer price: ₹${pricingA.customerPrice}`);
  
  if (pricingA.customerPrice !== 999) {
    throw new Error(`FAIL Test A: expected customerPrice to be 999, got ${pricingA.customerPrice}`);
  }
  console.log("Test A Passed!\n");

  // Test B: Base Price ₹2500 (8% tier)
  console.log("Running Test B: Base Price ₹2500...");
  const pricingB = calculateProductPricing(2500, null, platformSettings);
  // Base: 2500
  // Markup tier for 2500 is 8%. Markup: 2500 * 0.08 = 200
  // Pre-GST price: 2500 + 200 + 7 = 2707
  // Seller processing fee (2%): 2500 * 0.02 = 50
  // Platform revenue base: 200 + 50 + 7 = 257
  // GST (18% on platform revenue): 257 * 0.18 = 46.26
  // All-in raw price: 2707 + 46.26 = 2753.26
  // Charm rounded: Math.ceil(2753.26 / 10) * 10 - 1 = 2759
  console.log(`Base Price: ₹2500`);
  console.log(`Markup: ₹${pricingB.markupAmount.toFixed(2)} (${(pricingB.markupRate * 100).toFixed(0)}%)`);
  console.log(`Platform Fee: ₹${pricingB.platformFeeAmount.toFixed(2)}`);
  console.log(`Seller processing fee: ₹${pricingB.sellerProcessingFee.toFixed(2)}`);
  console.log(`GST (18%): ₹${pricingB.gstAmount.toFixed(2)}`);
  console.log(`Final customer price: ₹${pricingB.customerPrice}`);
  if (pricingB.customerPrice !== 2759) {
    throw new Error(`FAIL Test B: expected customerPrice to be 2759, got ${pricingB.customerPrice}`);
  }
  console.log("Test B Passed!\n");

  console.log("=== ALL LOCAL PRICING INTEGRITY TESTS PASSED ===");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
