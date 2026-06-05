// convex/lib/errors.ts
// Typed error codes for consistent error handling across all Convex functions
// Usage: throw new ConvexError(HiveError.UNAUTHENTICATED)
//        throw new ConvexError({ code: HiveError.FORBIDDEN, message: "..." })

export const HiveError = {
  // Auth errors
  UNAUTHENTICATED:        "UNAUTHENTICATED",
  USER_NOT_FOUND:         "USER_NOT_FOUND",
  ACCOUNT_DISABLED:       "ACCOUNT_DISABLED",
  FORBIDDEN:              "FORBIDDEN",
  BOUTIQUE_ACCESS_DENIED: "BOUTIQUE_ACCESS_DENIED",
  BOUTIQUE_SUSPENDED:     "BOUTIQUE_SUSPENDED",

  // Resource errors
  NOT_FOUND:              "NOT_FOUND",
  ALREADY_EXISTS:         "ALREADY_EXISTS",

  // Order errors
  INSUFFICIENT_STOCK:     "INSUFFICIENT_STOCK",
  SLOT_FULL:              "SLOT_FULL",
  SLOT_EXPIRED:           "SLOT_EXPIRED",
  CART_EMPTY:             "CART_EMPTY",
  MIXED_BOUTIQUES:        "MIXED_BOUTIQUES",  // MVP: single boutique per order
  REGION_NOT_SERVICEABLE: "REGION_NOT_SERVICEABLE",
  INVALID_ORDER_STATUS:   "INVALID_ORDER_STATUS",

  // Payment errors
  PAYMENT_NOT_CAPTURED:   "PAYMENT_NOT_CAPTURED",
  PAYMENT_FAILED:         "PAYMENT_FAILED",
  RAZORPAY_ERROR:         "RAZORPAY_ERROR",
  WEBHOOK_SIGNATURE_FAIL: "WEBHOOK_SIGNATURE_FAIL",

  // Claims errors
  CLAIM_WINDOW_EXPIRED:   "CLAIM_WINDOW_EXPIRED",
  CLAIM_ALREADY_EXISTS:   "CLAIM_ALREADY_EXISTS",
  INVALID_CLAIM_STATUS:   "INVALID_CLAIM_STATUS",

  // Product errors
  PRODUCT_NOT_APPROVED:   "PRODUCT_NOT_APPROVED",
  PRODUCT_INACTIVE:       "PRODUCT_INACTIVE",
  READINESS_CHECK_FAILED: "READINESS_CHECK_FAILED",

  // Validation errors
  VALIDATION_ERROR:       "VALIDATION_ERROR",
  INVALID_INPUT:          "INVALID_INPUT",

  // System errors
  INTERNAL_ERROR:         "INTERNAL_ERROR",
  EXTERNAL_API_ERROR:     "EXTERNAL_API_ERROR",
} as const;

export type HiveErrorCode = (typeof HiveError)[keyof typeof HiveError];

export interface HiveErrorPayload {
  code: HiveErrorCode;
  message?: string;
  field?: string;
  details?: Record<string, unknown>;
}
