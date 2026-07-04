// convex/tests/retryPayment.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const runRetryPaymentTests = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING PAYMENT RETRY TESTS ===");
    
    // 1. Setup Phase
    const setupResult = await ctx.runMutation(internal.tests.retryPaymentSetup.setupRetryTestEnvironment);
    const { userId, productId, addressId, checkoutSessionId } = setupResult;

    // Test 1: Successful Retry
    console.log("Test 1: Successful Retry should lock stock and return new Razorpay ID (mock)");
    // The action is exported from api.payments, so we call it
    const retryResult = await ctx.runAction(internal.payments.retryCheckoutSession as any, {
      checkoutSessionId,
      token: "mock_user_" + userId,
    });
    console.log("Retry Result:", retryResult);
    if (!retryResult.razorpayOrderId || typeof retryResult.razorpayOrderId !== 'string') {
      throw new Error("Failed to generate Razorpay ID");
    }

    // Assert Stock is decremented to 0
    const stockCheck1 = await ctx.runMutation(internal.tests.retryPaymentSetup.checkProductStock, { productId });
    if (stockCheck1 !== 0) {
      throw new Error(`Test 1 Failed: Expected stock 0, got ${stockCheck1}`);
    }

    // Test 2: Out of Stock Retry
    console.log("Test 2: Out of stock retry should fail gracefully");
    const outOfStockSessionId = await ctx.runMutation(internal.tests.retryPaymentSetup.createFailedSession, {
      userId,
      addressId,
      productId,
    });

    try {
      await ctx.runAction(internal.payments.retryCheckoutSession as any, {
        checkoutSessionId: outOfStockSessionId,
        token: "mock_user_" + userId,
      });
      throw new Error("Test 2 Failed: Should have thrown out of stock error");
    } catch (e: any) {
      if (!e.message.includes("sold out")) {
        throw new Error(`Test 2 Failed: Unexpected error message: ${e.message}`);
      }
      console.log("Test 2 Passed: Correctly caught out of stock error");
    }

    // Assert stock remains 0 and not negative
    const stockCheck2 = await ctx.runMutation(internal.tests.retryPaymentSetup.checkProductStock, { productId });
    if (stockCheck2 !== 0) {
      throw new Error(`Test 2 Failed: Expected stock 0, got ${stockCheck2}`);
    }

    // Test 3: Rate Limiting
    console.log("Test 3: Rate limiting blocks abuse");
    // Restore stock so it doesn't fail on out of stock
    await ctx.runMutation(internal.tests.retryPaymentSetup.setProductStock, { productId, stock: 10 });
    
    // Hit it 3 more times for the rate limit (already hit once successfully)
    let rateLimitThrown = false;
    for (let i = 0; i < 4; i++) {
      const rateLimitSessionId = await ctx.runMutation(internal.tests.retryPaymentSetup.createFailedSession, {
        userId,
        addressId,
        productId,
      });
      try {
        await ctx.runAction(internal.payments.retryCheckoutSession as any, {
          checkoutSessionId: rateLimitSessionId,
          token: "mock_user_" + userId,
        });
      } catch (e: any) {
        if (e.message.includes("Too many requests")) {
          rateLimitThrown = true;
          console.log(`Test 3 Passed: Rate limit tripped on attempt ${i + 1}`);
          break;
        }
      }
    }

    if (!rateLimitThrown) {
      throw new Error("Test 3 Failed: Rate limit was not enforced after 4 attempts");
    }

    console.log("=== ALL PAYMENT RETRY TESTS PASSED ===");
    return "All tests passed!";
  }
});
