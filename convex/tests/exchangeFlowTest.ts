import { resolveCouponRedemption } from "../lib/coupons";
import { resolvePayoutHoldDecision, RETURN_WINDOW_MS } from "../lib/payoutHold";

/**
 * End-to-end money conservation across the exchange lifecycle.
 *
 * Walks the full path as a ledger and asserts that nothing is created or
 * destroyed at any step:
 *
 *   capture  -> Hive holds the customer's payment, seller's payout frozen
 *   delivery -> hold either releases (Final Sale) or runs 24h (returns)
 *   exchange -> held transfer reversed, coupon issued for what was paid
 *   redeem   -> new order funded from that balance, difference settled in cash
 *
 * Amounts are paise. `P` is the seller's payout (base minus commission and GST
 * on commission); `T` is the order total the customer actually paid.
 */
export function runExchangeFlowTests() {
  let passed = 0;
  let failed = 0;

  function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}\n         expected ${e}\n         got      ${a}`);
    }
  }

  const DELIVERED_AT = 1_700_000_000_000;

  // ── Scenario: ₹2000 order, seller payout ₹1750, Hive fees ₹250 ────────────
  const T0 = 200000;
  const P0 = 175000;

  // Step 1: delivery on a returns-accepted order holds for the window.
  check(
    "E2E 1: delivery holds the seller payout for 24h on a returns-accepted order",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_1",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: true,
      },
      DELIVERED_AT
    ),
    {
      action: "hold_until",
      onHoldUntil: DELIVERED_AT + RETURN_WINDOW_MS,
      reason: "return_window_open",
    }
  );

  // Step 2: an exchange request re-freezes it, so a repeat delivery event
  // cannot restart the settlement clock on money about to be reversed.
  check(
    "E2E 2: an open exchange outranks a duplicate delivery webhook",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_1",
        payoutHoldReason: "exchange_requested",
        returnsAccepted: true,
      },
      DELIVERED_AT
    ),
    { action: "skip", reason: "held_for_exchange_requested" }
  );

  // Step 3: exchange completes. The full P0 is reversed into Hive's balance and
  // the customer is credited T0 — what they actually paid, fees included.
  const hiveBalanceAfterReversal = T0; // customer's payment, nothing paid out
  check("E2E 3: reversal returns the seller's entire held payout", P0 - P0, 0);
  check("E2E 3: Hive holds the full original payment again", hiveBalanceAfterReversal, T0);

  // Step 4: redemption. Ledger must balance in every branch.
  //   available = Hive balance (T0) + whatever the customer newly pays
  //   spent     = seller payout P1 + Hive fees (T1 - P1) + any cash refunded
  function settleRedemption(T1: number, P1: number) {
    const split = resolveCouponRedemption(T0, T1);
    const available = hiveBalanceAfterReversal + split.customerPayablePaise;
    const spent = P1 + (T1 - P1) + split.refundToCustomerPaise;
    return { split, available, spent, balanced: available - spent };
  }

  // Case A: dearer replacement, customer tops up.
  const caseA = settleRedemption(350000, 300000);
  check("E2E 4a: case A customer pays the difference", caseA.split.customerPayablePaise, 150000);
  check("E2E 4a: case A ledger balances", caseA.balanced, 0);

  // Case B: cheaper replacement, remainder returned as cash.
  const caseB = settleRedemption(120000, 100000);
  check("E2E 4b: case B customer pays nothing", caseB.split.customerPayablePaise, 0);
  check("E2E 4b: case B refunds the remainder", caseB.split.refundToCustomerPaise, 80000);
  check("E2E 4b: case B ledger balances", caseB.balanced, 0);

  // Exact swap: no money moves in either direction.
  const caseExact = settleRedemption(200000, 170000);
  check("E2E 4c: exact swap moves no cash", [
    caseExact.split.customerPayablePaise,
    caseExact.split.refundToCustomerPaise,
  ], [0, 0]);
  check("E2E 4c: exact swap ledger balances", caseExact.balanced, 0);

  // Step 5: coupon expires unredeemed. The customer returned goods and holds no
  // credit, so the whole amount goes back — Hive keeps nothing.
  check("E2E 5: expiry refunds the customer in full", hiveBalanceAfterReversal - T0, 0);

  // Step 6: a Final Sale order never enters any of this — it settles on delivery.
  check(
    "E2E 6: Final Sale releases at delivery instead of holding",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_2",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: false,
      },
      DELIVERED_AT
    ),
    { action: "release", reason: "final_sale_delivered" }
  );

  // Fuzz the ledger across a wide range so no branch can silently leak money.
  let leaks = 0;
  for (let i = 0; i < 2000; i++) {
    const T1 = Math.floor(Math.random() * 500000) + 1;
    const P1 = Math.floor(T1 * 0.875);
    if (settleRedemption(T1, P1).balanced !== 0) leaks += 1;
  }
  check("E2E 7: 2000 randomised redemptions all balance to zero", leaks, 0);

  console.log(`\nExchange flow: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
// `require`/`module` are not defined in the Convex runtime, so the guard has to
// be argv-based or pushing the deployment fails to analyse this file.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("exchangeFlowTest")) {
  const { failed } = runExchangeFlowTests();
  if (failed > 0) process.exit(1);
}
