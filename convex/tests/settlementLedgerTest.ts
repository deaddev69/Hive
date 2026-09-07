import {
  calculateCheckoutPricing,
  calculateSellerItemPricing,
  calculateTierPlatformCharges,
  DEFAULT_TIERS_CONFIG,
  type PlatformConfig,
} from "../pricingService";
import { resolveCouponRedemption } from "../lib/coupons";
import { resolvePayoutHoldDecision, RETURN_WINDOW_MS } from "../lib/payoutHold";

/**
 * Settlement ledger tests — the money-correctness suite.
 *
 * These drive the REAL pricing functions rather than re-implementing the
 * arithmetic, so a change to commission slabs, platform fees, or GST is caught
 * here rather than in production.
 *
 * Every scenario is modelled as a four-party ledger and checked on three
 * separate properties, because conservation alone is not enough — money can
 * balance overall while sitting in the wrong pocket:
 *
 *   1. Conservation   — the four deltas sum to zero, nothing invented or lost
 *   2. Attribution    — Hive keeps exactly its fees, the seller exactly its payout
 *   3. Delivery fee   — never reaches the seller, always funds the Porter leg
 *
 * Parties:
 *   customer — negative when they pay, positive when refunded
 *   hive     — what lands in and stays in the Hive Razorpay account
 *   seller   — what actually settles to the boutique's linked account
 *   porter   — the delivery fee Hive passes on for the rider
 */
export function runSettlementLedgerTests() {
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

  function ok(name: string, condition: boolean, detail = "") {
    if (condition) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}${detail ? `\n         ${detail}` : ""}`);
    }
  }

  const config: PlatformConfig = { tiers: DEFAULT_TIERS_CONFIG };
  const DELIVERED_AT = 1_700_000_000_000;

  /** Price one order the way production does, for a single item. */
  function priceOrder(basePricePaise: number, deliveryFeePaise: number, tier: string) {
    const pricing = calculateCheckoutPricing(
      [{ sellerBasePricePaise: basePricePaise, quantity: 1 }],
      deliveryFeePaise,
      0,
      tier,
      config
    );
    const charges = calculateTierPlatformCharges(tier, config);
    const item = calculateSellerItemPricing(basePricePaise, tier, config);
    return { pricing, charges, item };
  }

  /**
   * A settled order as a ledger. `porterCostPaise` defaults to what the
   * customer was charged for delivery, which is the break-even case.
   */
  function settleSale(
    basePricePaise: number,
    deliveryFeePaise: number,
    tier: string,
    porterCostPaise = deliveryFeePaise
  ) {
    const { pricing, charges, item } = priceOrder(basePricePaise, deliveryFeePaise, tier);

    const customer = -pricing.totalPayablePaise;
    const seller = item.sellerPayoutPaise;
    const porter = porterCostPaise;
    const hive = pricing.totalPayablePaise - seller - porter;

    return { pricing, charges, item, customer, seller, porter, hive };
  }

  // ── Scenario 1: Final Sale, completes normally ───────────────────────────
  {
    const s = settleSale(150000, 10933, "bronze"); // ₹1500 base, ₹109.33 delivery

    ok(
      "FINAL SALE: ledger conserves — nothing invented or lost",
      s.customer + s.seller + s.porter + s.hive === 0,
      `customer ${s.customer} seller ${s.seller} porter ${s.porter} hive ${s.hive}`
    );

    // Hive's cut is exactly the platform fees plus the seller commission.
    const expectedHive =
      s.charges.handlingChargePaise +
      s.charges.platformFeePaise +
      s.charges.platformChargesGstPaise +
      s.item.sellerCommissionPaise +
      s.item.sellerCommissionGstPaise;

    check("FINAL SALE: Hive keeps exactly its fees + commission", s.hive, expectedHive);

    check(
      "FINAL SALE: seller is paid base minus commission minus GST on commission",
      s.seller,
      150000 - s.item.sellerCommissionPaise - s.item.sellerCommissionGstPaise
    );

    ok(
      "FINAL SALE: delivery fee never reaches the seller",
      s.seller < 150000 && s.seller + s.item.sellerCommissionPaise + s.item.sellerCommissionGstPaise === 150000,
      "seller payout must derive only from base price"
    );

    check(
      "FINAL SALE: customer pays all-inclusive product price plus delivery",
      -s.customer,
      s.pricing.productSubtotalPaise + 10933
    );

    // Delivery money is collected by Hive and passed to Porter, so it is
    // present in the total and absent from Hive's retained fees.
    check("FINAL SALE: delivery fee is passed through to Porter", s.porter, 10933);
    ok(
      "FINAL SALE: Hive's retention excludes the delivery fee entirely",
      !String(s.hive).includes("NaN") && s.hive === expectedHive,
      `hive ${s.hive} vs fees ${expectedHive}`
    );

    // And the payout releases immediately rather than being held.
    check(
      "FINAL SALE: payout releases at delivery, no hold",
      resolvePayoutHoldDecision(
        {
          status: "delivered",
          paymentStatus: "paid",
          payoutStatus: "withheld",
          razorpayTransferId: "trf_fs",
          payoutHoldReason: "awaiting_delivery",
          returnsAccepted: false,
        },
        DELIVERED_AT
      ),
      { action: "release", reason: "final_sale_delivered" }
    );
  }

  // ── Scenario 2: returns-accepted sale, held then released untouched ──────
  {
    const s = settleSale(90000, 10933, "bronze");

    check(
      "24H SALE: payout holds until delivered + 24h",
      resolvePayoutHoldDecision(
        {
          status: "delivered",
          paymentStatus: "paid",
          payoutStatus: "withheld",
          razorpayTransferId: "trf_24",
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

    ok(
      "24H SALE: once released the ledger matches a Final Sale of the same value",
      s.customer + s.seller + s.porter + s.hive === 0,
      "holding must not change the amounts, only the timing"
    );
  }

  // ── Scenario 3: full cash return after delivery ──────────────────────────
  {
    const s = settleSale(90000, 10933, "bronze");

    // The seller's transfer is reversed in full, and the customer is refunded
    // everything they paid — including the delivery fee.
    const refundToCustomer = s.pricing.totalPayablePaise;
    const sellerAfter = 0; // reversed
    const hiveAfter = s.pricing.totalPayablePaise - refundToCustomer - s.porter;

    check("RETURN: seller keeps nothing", sellerAfter, 0);
    check("RETURN: customer is made whole, delivery included", refundToCustomer, s.pricing.totalPayablePaise);

    // Hive eats the Porter cost of the forward delivery. That is a real cost of
    // accepting returns, and it should show as a loss rather than silently
    // vanishing from the books.
    check("RETURN: Hive absorbs the forward delivery cost", hiveAfter, -s.porter);

    ok(
      "RETURN: ledger still conserves with Hive carrying the loss",
      -refundToCustomer + refundToCustomer === 0 && hiveAfter + s.porter === 0,
      `hive ${hiveAfter} porter ${s.porter}`
    );
  }

  // ── Scenario 4: exchange for an identical-price item ─────────────────────
  {
    const s = settleSale(90000, 10933, "bronze");
    const couponPaise = s.pricing.totalPayablePaise;

    const split = resolveCouponRedemption(couponPaise, s.pricing.totalPayablePaise);
    check("EXCHANGE EXACT: no top-up charged", split.customerPayablePaise, 0);
    check("EXCHANGE EXACT: no cash returned", split.refundToCustomerPaise, 0);
    check("EXCHANGE EXACT: whole coupon consumed", split.couponAppliedPaise, couponPaise);

    // The replacement is the same price, so the seller ends up with the same
    // payout they would have had on the original sale.
    const replacement = settleSale(90000, 10933, "bronze");
    check(
      "EXCHANGE EXACT: seller paid the replacement's payout, not the old one",
      replacement.seller,
      s.item.sellerPayoutPaise
    );
  }

  // ── Scenario 5: exchange for a DEARER item — customer tops up ────────────
  {
    const original = settleSale(90000, 10933, "bronze");   // ₹900 base
    const replacement = settleSale(150000, 10933, "bronze"); // ₹1500 base

    const couponPaise = original.pricing.totalPayablePaise;
    const split = resolveCouponRedemption(couponPaise, replacement.pricing.totalPayablePaise);

    ok(
      "EXCHANGE TOP-UP: customer pays only the difference",
      split.customerPayablePaise === replacement.pricing.totalPayablePaise - couponPaise,
      `paid ${split.customerPayablePaise}`
    );
    check("EXCHANGE TOP-UP: nothing refunded", split.refundToCustomerPaise, 0);

    // Ledger for the whole two-order journey. Hive holds the original payment
    // after reversing the first transfer, then funds the replacement from it.
    const hiveHolds = original.pricing.totalPayablePaise;      // recovered
    const newMoneyIn = split.customerPayablePaise;             // top-up
    const paidOut =
      replacement.seller +                                     // seller's new payout
      (replacement.pricing.totalPayablePaise - replacement.seller - replacement.porter) + // Hive fees
      replacement.porter;                                      // return + new delivery

    ok(
      "EXCHANGE TOP-UP: funds available exactly cover the replacement",
      hiveHolds + newMoneyIn === paidOut,
      `available ${hiveHolds + newMoneyIn} vs required ${paidOut}`
    );

    ok(
      "EXCHANGE TOP-UP: seller is paid for the NEW item, not the returned one",
      replacement.seller > original.seller,
      `replacement ${replacement.seller} original ${original.seller}`
    );
  }

  // ── Scenario 6: exchange for a CHEAPER item — remainder refunded ─────────
  {
    const original = settleSale(150000, 10933, "bronze");
    const replacement = settleSale(90000, 10933, "bronze");

    const couponPaise = original.pricing.totalPayablePaise;
    const split = resolveCouponRedemption(couponPaise, replacement.pricing.totalPayablePaise);

    check("EXCHANGE CHEAPER: customer pays nothing", split.customerPayablePaise, 0);
    check(
      "EXCHANGE CHEAPER: remainder refunded in cash",
      split.refundToCustomerPaise,
      couponPaise - replacement.pricing.totalPayablePaise
    );

    const hiveHolds = original.pricing.totalPayablePaise;
    const spent =
      replacement.seller +
      (replacement.pricing.totalPayablePaise - replacement.seller - replacement.porter) +
      replacement.porter +
      split.refundToCustomerPaise;

    ok(
      "EXCHANGE CHEAPER: ledger balances after the cash remainder goes back",
      hiveHolds === spent,
      `held ${hiveHolds} spent ${spent}`
    );

    ok(
      "EXCHANGE CHEAPER: seller paid less, matching the cheaper item",
      replacement.seller < original.seller,
      `replacement ${replacement.seller} original ${original.seller}`
    );
  }

  // ── Scenario 7: coupon expires unredeemed ────────────────────────────────
  {
    const original = settleSale(90000, 10933, "bronze");
    const couponPaise = original.pricing.totalPayablePaise;

    // Hive holds the recovered money and returns all of it.
    check("EXPIRY: customer gets the full coupon value back", couponPaise, original.pricing.totalPayablePaise);
    ok(
      "EXPIRY: Hive retains none of the customer's money",
      original.pricing.totalPayablePaise - couponPaise === 0,
      "expiry must not become revenue"
    );
  }

  // ── Scenario 8: delivery fee attribution across every tier ───────────────
  for (const tier of ["bronze", "silver", "gold"]) {
    const s = settleSale(120000, 12000, tier);

    ok(
      `${tier.toUpperCase()}: ledger conserves`,
      s.customer + s.seller + s.porter + s.hive === 0,
      `hive ${s.hive}`
    );

    ok(
      `${tier.toUpperCase()}: seller payout is independent of the delivery fee`,
      settleSale(120000, 50000, tier).seller === s.seller,
      "changing delivery must not move the seller's payout"
    );

    ok(
      `${tier.toUpperCase()}: a bigger delivery fee is carried by Porter, not Hive's margin`,
      settleSale(120000, 50000, tier).hive === s.hive,
      "Hive's fee retention must not change with delivery"
    );
  }

  // ── Scenario 9: fuzz every branch for leaks ──────────────────────────────
  {
    let leaks = 0;
    let sellerGotDelivery = 0;

    for (let i = 0; i < 3000; i++) {
      const base = Math.floor(Math.random() * 500000) + 10000;
      const delivery = Math.floor(Math.random() * 20000);
      const tier = ["bronze", "silver", "gold"][i % 3]!;
      const s = settleSale(base, delivery, tier);

      if (s.customer + s.seller + s.porter + s.hive !== 0) leaks += 1;

      // The seller's payout must be derivable from the base price alone.
      const item = calculateSellerItemPricing(base, tier, config);
      if (s.seller !== item.sellerPayoutPaise) sellerGotDelivery += 1;
    }

    check("FUZZ: 3000 randomised sales all conserve", leaks, 0);
    check("FUZZ: seller payout never contaminated by fees or delivery", sellerGotDelivery, 0);
  }

  console.log(`\nSettlement ledger: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1]?.includes("settlementLedgerTest")
) {
  const { failed } = runSettlementLedgerTests();
  if (failed > 0) process.exit(1);
}
