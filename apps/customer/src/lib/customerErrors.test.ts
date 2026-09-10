// apps/customer/src/lib/customerErrors.test.ts
//
// The point of these assertions is the negative one: nothing a shopper sees may come from a
// caught error's `message`. That field is where Convex puts the internal function name and the
// request id, and it was reaching shoppers at checkout, on the account page and in the review
// modal.
//
// Run with: npx tsx apps/customer/src/lib/customerErrors.test.ts

import { getCustomerErrorMessage, getCustomerErrorCode } from "./customerErrors";

let passed = 0;
let failed = 0;

function assertEqual(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
  }
}

const GENERIC = "Something went wrong. Please try again.";

/** What a Convex failure actually looks like on the client. */
const CONVEX_INTERNAL =
  "[CONVEX A(payments:createCheckoutSession)] [Request ID: 7f2a91c4] Server Error";

// ── 1. A raw exception never reaches the shopper ─────────────────────────────
{
  const err = new Error(CONVEX_INTERNAL);
  const shown = getCustomerErrorMessage(err);
  assertEqual("a plain Error falls back", shown, GENERIC);
  assertEqual("the internal text is not shown", shown.includes("CONVEX"), false);
  assertEqual("the request id is not shown", shown.includes("Request ID"), false);
  assertEqual("the function name is not shown", shown.includes("createCheckoutSession"), false);

  // The caller's own wording wins over the generic line, but still never the exception's.
  const withFallback = getCustomerErrorMessage(err, "We couldn't start this payment. Please try again.");
  assertEqual("caller fallback is used", withFallback, "We couldn't start this payment. Please try again.");
  assertEqual("caller fallback still hides internals", withFallback.includes("CONVEX"), false);
}

// ── 2. Messages the backend wrote for a shopper do get through ───────────────
{
  // convex/pricingService.ts throws this shape when the cart price has drifted.
  const stale = {
    data: {
      code: "STALE_CART_PRICE",
      message:
        "The prices of some items in your cart have been updated. Please review your new total before checking out.",
    },
  };
  assertEqual(
    "ConvexError object payload is shown",
    getCustomerErrorMessage(stale),
    "The prices of some items in your cart have been updated. Please review your new total before checking out."
  );
  assertEqual("its code is readable for branching", getCustomerErrorCode(stale), "STALE_CART_PRICE");

  // The other shape this backend throws: ConvexError with a bare string.
  const bare = { data: "A valid slug or title is required." };
  assertEqual("ConvexError string payload is shown", getCustomerErrorMessage(bare), "A valid slug or title is required.");
  assertEqual("a string payload has no code", getCustomerErrorCode(bare), undefined);

  // A curated message beats the caller's fallback — the backend knew something specific.
  assertEqual("payload outranks fallback", getCustomerErrorMessage(stale, "Payment failed."), stale.data.message);
}

// ── 3. Degenerate payloads fall back rather than showing nothing ─────────────
{
  assertEqual("empty string payload falls back", getCustomerErrorMessage({ data: "" }), GENERIC);
  assertEqual("whitespace payload falls back", getCustomerErrorMessage({ data: "   " }), GENERIC);
  assertEqual("payload with empty message falls back", getCustomerErrorMessage({ data: { message: "" } }), GENERIC);
  assertEqual("payload with only a code falls back", getCustomerErrorMessage({ data: { code: "X" } }), GENERIC);
  assertEqual("payload message is trimmed", getCustomerErrorMessage({ data: { message: "  Out of stock.  " } }), "Out of stock.");
}

// ── 4. Nothing throws on the shapes a catch block really receives ────────────
{
  assertEqual("null", getCustomerErrorMessage(null), GENERIC);
  assertEqual("undefined", getCustomerErrorMessage(undefined), GENERIC);
  assertEqual("a thrown string", getCustomerErrorMessage("boom"), GENERIC);
  assertEqual("a thrown number", getCustomerErrorMessage(42), GENERIC);
  assertEqual("an empty object", getCustomerErrorMessage({}), GENERIC);
  assertEqual("data set to null", getCustomerErrorMessage({ data: null }), GENERIC);
  assertEqual("code on a non-object payload", getCustomerErrorCode("boom"), undefined);
  assertEqual("code on null", getCustomerErrorCode(null), undefined);
}

// ── 5. A message field on the error itself is still not a payload ────────────
{
  // The trap this helper exists to prevent: `message` looks usable and is not.
  const err = Object.assign(new Error(CONVEX_INTERNAL), { data: undefined });
  assertEqual("message is ignored even when present", getCustomerErrorMessage(err), GENERIC);
}

console.log(`\nCustomer error messages: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Customer error message tests failed (${failed} failures)`);
