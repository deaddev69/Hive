import {
  resolveCouponRedemption,
  validateCouponForCart,
  generateCouponCode,
  COUPON_VALIDITY_MS,
  type ValidatableCoupon,
} from "../lib/coupons";

/**
 * Regression tests for exchange-coupon redemption and scoping.
 *
 * The rules that carry money or trust:
 *   - case A / B / exact split, and that a coupon is fully consumed either way
 *   - a coupon never works at another seller's boutique
 *   - used / revoked / expired coupons are refused
 */
export function runCouponTests() {
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

  // ── Redemption maths (all values in paise) ────────────────────────────────
  check(
    "Case A: new order larger, customer tops up the difference",
    resolveCouponRedemption(200000, 350000),
    {
      redemptionCase: "A",
      customerPayablePaise: 150000,
      refundToCustomerPaise: 0,
      couponAppliedPaise: 200000,
    }
  );

  check(
    "Case B: new order smaller, remainder refunded as cash",
    resolveCouponRedemption(200000, 120000),
    {
      redemptionCase: "B",
      customerPayablePaise: 0,
      refundToCustomerPaise: 80000,
      couponAppliedPaise: 120000,
    }
  );

  check(
    "Exact match: nothing moves either way",
    resolveCouponRedemption(200000, 200000),
    {
      redemptionCase: "exact",
      customerPayablePaise: 0,
      refundToCustomerPaise: 0,
      couponAppliedPaise: 200000,
    }
  );

  check(
    "Case A boundary: one paise over is still case A",
    resolveCouponRedemption(200000, 200001),
    {
      redemptionCase: "A",
      customerPayablePaise: 1,
      refundToCustomerPaise: 0,
      couponAppliedPaise: 200000,
    }
  );

  check(
    "Case B boundary: one paise under is still case B",
    resolveCouponRedemption(200000, 199999),
    {
      redemptionCase: "B",
      customerPayablePaise: 0,
      refundToCustomerPaise: 1,
      couponAppliedPaise: 199999,
    }
  );

  // Conservation: the customer is never out of pocket beyond the new order, and
  // never gets more back than the coupon was worth.
  for (const [coupon, order] of [
    [200000, 350000],
    [200000, 120000],
    [200000, 200000],
    [99999, 1],
    [1, 99999],
  ] as Array<[number, number]>) {
    const r = resolveCouponRedemption(coupon, order);
    const customerNet = r.customerPayablePaise - r.refundToCustomerPaise;
    check(
      `Conservation: coupon ${coupon} vs order ${order} -> customer nets ${order - coupon}`,
      customerNet,
      order - coupon
    );
  }

  // ── Scoping and status ────────────────────────────────────────────────────
  const NOW = 1_700_000_000_000;
  const SELLER_A = "boutique_A";
  const SELLER_B = "boutique_B";
  const CUSTOMER = "user_1";

  function coupon(overrides: Partial<ValidatableCoupon> = {}): ValidatableCoupon {
    return {
      status: "active",
      boutiqueId: SELLER_A,
      customerId: CUSTOMER,
      expiresAt: NOW + COUPON_VALIDITY_MS,
      ...overrides,
    };
  }

  check(
    "Valid coupon on its own boutique's cart is accepted",
    validateCouponForCart(coupon(), { customerId: CUSTOMER, boutiqueIds: [SELLER_A] }, NOW),
    { valid: true }
  );

  check(
    "Coupon is refused on another seller's cart",
    validateCouponForCart(coupon(), { customerId: CUSTOMER, boutiqueIds: [SELLER_B] }, NOW)
      .valid,
    false
  );

  check(
    "Coupon is refused on a mixed-seller cart that includes its own boutique",
    validateCouponForCart(
      coupon(),
      { customerId: CUSTOMER, boutiqueIds: [SELLER_A, SELLER_B] },
      NOW
    ).valid,
    false
  );

  check(
    "Coupon is refused for a different customer",
    validateCouponForCart(
      coupon(),
      { customerId: "user_2", boutiqueIds: [SELLER_A] },
      NOW
    ).valid,
    false
  );

  check(
    "Already-used coupon cannot be reused",
    validateCouponForCart(
      coupon({ status: "used" }),
      { customerId: CUSTOMER, boutiqueIds: [SELLER_A] },
      NOW
    ).valid,
    false
  );

  check(
    "Revoked coupon is refused",
    validateCouponForCart(
      coupon({ status: "revoked" }),
      { customerId: CUSTOMER, boutiqueIds: [SELLER_A] },
      NOW
    ).valid,
    false
  );

  check(
    "Coupon expiring exactly now is refused",
    validateCouponForCart(
      coupon({ expiresAt: NOW }),
      { customerId: CUSTOMER, boutiqueIds: [SELLER_A] },
      NOW
    ).valid,
    false
  );

  check(
    "Coupon one millisecond before expiry is still accepted",
    validateCouponForCart(
      coupon({ expiresAt: NOW + 1 }),
      { customerId: CUSTOMER, boutiqueIds: [SELLER_A] },
      NOW
    ),
    { valid: true }
  );

  check(
    "Empty cart is refused",
    validateCouponForCart(coupon(), { customerId: CUSTOMER, boutiqueIds: [] }, NOW).valid,
    false
  );

  // ── Code generation ───────────────────────────────────────────────────────
  check("Code uses the HIVE- prefix and 6 body chars", generateCouponCode(() => 0), "HIVE-AAAAAA");

  const codes = new Set<string>();
  for (let i = 0; i < 500; i++) codes.add(generateCouponCode());
  check("500 generated codes are all well-formed",
    Array.from(codes).every((c) => /^HIVE-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(c)),
    true
  );
  check("Codes exclude look-alike characters O/0/I/1",
    Array.from(codes).some((c) => /[O0I1]/.test(c.slice(5))),
    false
  );

  console.log(`\nCoupons: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
// `require`/`module` are not defined in the Convex runtime, so the guard has to
// be argv-based or pushing the deployment fails to analyse this file.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("couponTest")) {
  const { failed } = runCouponTests();
  if (failed > 0) process.exit(1);
}
