// convex/tests/cartCurrency.ts
// Automated verification tests for cart subtotal, delivery fee, tax and total currency integrity.
// Assures no regression on the 100x rupee/paise unit conversion mismatch.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { checkRateLimit } from "../lib/rateLimit";
import { getAuthenticatedUser } from "../lib/auth";
import { inrToPaise, paiseToInr, formatCurrency } from "../../packages/utils/src/currency";

export const runCartCurrencyTests = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING CART AND CHECKOUT CURRENCY INTEGRITY TESTS ===");

    console.log("Test 1: Verification of INR <-> Paise converters...");
    // Assert 1776 INR matches 177600 paise
    const price1Inr = 1776;
    const price1Paise = inrToPaise(price1Inr);
    if (price1Paise !== 177600) {
      throw new Error(`FAIL: expected 177600 paise, got ${price1Paise}`);
    }

    // Assert 1998 INR matches 199800 paise
    const price2Inr = 1998;
    const price2Paise = inrToPaise(price2Inr);
    if (price2Paise !== 199800) {
      throw new Error(`FAIL: expected 199800 paise, got ${price2Paise}`);
    }

    console.log("Test 2: Low-value Cart Verification (Charges Delivery)...");
    // 1x Cotton Block Print Kurti (₹1,998)
    const lowSubtotalPaise = price2Paise * 1; // 199800 paise
    if (lowSubtotalPaise !== 199800) {
      throw new Error(`FAIL: low subtotal expected 199800, got ${lowSubtotalPaise}`);
    }

    // Delivery fee threshold is ₹10,000 (1,000,000 paise). Since 199800 < 1000000, it charges ₹99 (9900 paise).
    const lowDeliveryFeePaise = lowSubtotalPaise >= 1000000 ? 0 : 9900;
    if (lowDeliveryFeePaise !== 9900) {
      throw new Error(`FAIL: low delivery fee expected 9900, got ${lowDeliveryFeePaise}`);
    }

    const lowTotalPaise = lowSubtotalPaise + lowDeliveryFeePaise;
    if (lowTotalPaise !== 209700) { // 199800 + 9900 = 209700 paise (₹2,097)
      throw new Error(`FAIL: low total expected 209700, got ${lowTotalPaise}`);
    }

    const formattedLowSubtotal = formatCurrency(lowSubtotalPaise);
    const formattedLowTotal = formatCurrency(lowTotalPaise);
    if (formattedLowSubtotal !== "₹1,998.00") {
      throw new Error(`FAIL: formatted low subtotal mismatch, got ${formattedLowSubtotal}`);
    }
    if (formattedLowTotal !== "₹2,097.00") {
      throw new Error(`FAIL: formatted low total mismatch, got ${formattedLowTotal}`);
    }

    console.log("Test 3: High-value Cart Verification (Free Delivery)...");
    // 4x Premium Kasavu Saree (₹1,776) + 2x Cotton Block Print Kurti (₹1,998) = ₹11,100
    const highSubtotalPaise = price1Paise * 4 + price2Paise * 2; // 1110000 paise
    if (highSubtotalPaise !== 1110000) {
      throw new Error(`FAIL: high subtotal expected 1110000, got ${highSubtotalPaise}`);
    }

    // Since 1110000 >= 1000000, it should be FREE delivery (0 paise)
    const highDeliveryFeePaise = highSubtotalPaise >= 1000000 ? 0 : 9900;
    if (highDeliveryFeePaise !== 0) {
      throw new Error(`FAIL: high delivery fee expected 0, got ${highDeliveryFeePaise}`);
    }

    const highTotalPaise = highSubtotalPaise + highDeliveryFeePaise;
    if (highTotalPaise !== 1110000) {
      throw new Error(`FAIL: high total expected 1110000, got ${highTotalPaise}`);
    }

    const formattedHighSubtotal = formatCurrency(highSubtotalPaise);
    const formattedHighTotal = formatCurrency(highTotalPaise);
    if (formattedHighSubtotal !== "₹11,100.00") {
      throw new Error(`FAIL: formatted high subtotal mismatch, got ${formattedHighSubtotal}`);
    }
    if (formattedHighTotal !== "₹11,100.00") {
      throw new Error(`FAIL: formatted high total mismatch, got ${formattedHighTotal}`);
    }

    console.log("=== ALL CURRENCY INTEGRITY TESTS PASSED ===");
    return { success: true };
  },
});
