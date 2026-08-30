// convex/lib/coupons.ts
// Pure coupon logic: validity window, code generation, and redemption maths.
//
// Kept free of Convex ctx so it can be unit-tested directly
// (see convex/tests/couponTest.ts), matching the isSignatureBypassAllowed pattern.
//
// ── Money model ──────────────────────────────────────────────────────────────
// A coupon's amount is what the CUSTOMER PAID for the original order (its
// total, including delivery and platform fees). That is deliberately NOT the
// same number as the seller's Route transfer for that order, which is only
// `sellerPayoutPaise` (base price minus commission minus GST on commission).
//
// Because those two numbers differ, the coupon cannot be settled by "releasing
// the original held transfer" — it would release the wrong amount. Instead:
//
//   exchange completes -> the original held transfer is REVERSED in full, so
//                         the entire original payment sits back in Hive's
//                         balance, and the coupon is a Hive-side credit
//   coupon redeemed    -> the new order is an ordinary order that happens to be
//                         part-funded from that balance; the seller receives a
//                         normal transfer for the NEW order's payout
//
// The capture-time hold is what makes this safe: the money is frozen in the
// seller's linked account and cannot have been withdrawn, so the reversal at
// exchange completion always succeeds.

/** Coupons are valid for 30 days from issue. */
export const COUPON_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;

/** Unambiguous alphabet — no O/0, I/1, so codes survive being read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a coupon code. `randomInt` is injectable so tests are deterministic.
 * Format: HIVE-XXXXXX
 */
export function generateCouponCode(
  randomInt: (maxExclusive: number) => number = (max) => Math.floor(Math.random() * max)
): string {
  let body = "";
  for (let i = 0; i < 6; i++) {
    body += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return `HIVE-${body}`;
}

export type CouponRedemption = {
  /** A: customer tops up. B: customer is refunded the remainder. exact: neither. */
  redemptionCase: "A" | "B" | "exact";
  /** What the customer must pay through Razorpay for the new order. */
  customerPayablePaise: number;
  /** Remainder returned to the customer's original payment method. */
  refundToCustomerPaise: number;
  /** Coupon value actually consumed against the new order. */
  couponAppliedPaise: number;
};

/**
 * Split a coupon against a new order total.
 *
 * The coupon is single-use in every branch: any remainder in case B is refunded
 * as cash, never left on the coupon for a second redemption.
 */
export function resolveCouponRedemption(
  couponAmountPaise: number,
  newOrderTotalPaise: number
): CouponRedemption {
  if (newOrderTotalPaise > couponAmountPaise) {
    return {
      redemptionCase: "A",
      customerPayablePaise: newOrderTotalPaise - couponAmountPaise,
      refundToCustomerPaise: 0,
      couponAppliedPaise: couponAmountPaise,
    };
  }

  if (newOrderTotalPaise < couponAmountPaise) {
    return {
      redemptionCase: "B",
      customerPayablePaise: 0,
      refundToCustomerPaise: couponAmountPaise - newOrderTotalPaise,
      couponAppliedPaise: newOrderTotalPaise,
    };
  }

  return {
    redemptionCase: "exact",
    customerPayablePaise: 0,
    refundToCustomerPaise: 0,
    couponAppliedPaise: couponAmountPaise,
  };
}

export type CouponValidity =
  | { valid: true }
  | { valid: false; reason: string; message: string };

export type ValidatableCoupon = {
  status: string;
  boutiqueId: string;
  customerId: string;
  expiresAt: number;
};

/**
 * Server-side coupon gate. Scope is the important rule here: a coupon is
 * redeemable only against its issuing boutique, so a cart containing any other
 * seller's products must be rejected.
 */
export function validateCouponForCart(
  coupon: ValidatableCoupon,
  cart: { customerId: string; boutiqueIds: string[] },
  now: number
): CouponValidity {
  if (coupon.customerId !== cart.customerId) {
    return {
      valid: false,
      reason: "wrong_customer",
      message: "This coupon belongs to a different account.",
    };
  }

  if (coupon.status === "used") {
    return {
      valid: false,
      reason: "already_used",
      message: "This coupon has already been used.",
    };
  }
  if (coupon.status === "revoked") {
    return {
      valid: false,
      reason: "revoked",
      message: "This coupon is no longer valid. Contact Hive support.",
    };
  }
  if (coupon.status === "expired" || coupon.expiresAt <= now) {
    return {
      valid: false,
      reason: "expired",
      message: "This coupon has expired and the amount has been refunded to you.",
    };
  }
  if (coupon.status !== "active") {
    return {
      valid: false,
      reason: "not_active",
      message: "This coupon cannot be used right now.",
    };
  }

  const uniqueBoutiques = Array.from(new Set(cart.boutiqueIds));
  if (uniqueBoutiques.length === 0) {
    return { valid: false, reason: "empty_cart", message: "Your bag is empty." };
  }
  if (uniqueBoutiques.some((id) => id !== coupon.boutiqueId)) {
    return {
      valid: false,
      reason: "wrong_boutique",
      message: "This coupon only works on items from the boutique that issued it.",
    };
  }

  return { valid: true };
}
