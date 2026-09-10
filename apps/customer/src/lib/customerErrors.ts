// Turns a caught error into something a shopper should read. Companion to authErrors.ts, which
// does the same job for Firebase Auth codes.
//
// Never show a caught error's `message` to a customer. A Convex failure arrives looking like
//
//   [CONVEX M(users:updatePhone)] [Request ID: 7f2a…] Server Error
//
// which names an internal function, leaks a request id, and tells the shopper nothing they can
// act on. Reaching a customer mid-checkout, it reads as an unfinished internal build.
//
// The one thing worth surfacing is a message the backend deliberately wrote for a shopper.
// Convex delivers those through ConvexError's `data` payload, which this codebase throws in two
// shapes — a bare string, or an object carrying a `code` and a `message`. Anything else is an
// unplanned failure, and the honest answer there is the generic line rather than a guess dressed
// up as an explanation.
//
// `message` is deliberately never read: in a Convex production deployment a plain `throw new
// Error("...")` is redacted to "Server Error" anyway, so salvaging it would buy nothing in the
// only environment that matters and would leak internals everywhere else.

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/** The ConvexError payload shapes this backend throws. */
type ConvexErrorData = string | { code?: string; message?: string } | undefined;

/**
 * A shopper-safe message for a caught error.
 *
 * Always keep the original error for the console and Sentry — this is for display only, and
 * deliberately discards the detail that makes an error diagnosable.
 *
 * @param fallback Copy for when the backend offered nothing usable. Use it to say what failed
 *                 ("We couldn't save your phone number.") rather than restating the generic line.
 */
export function getCustomerErrorMessage(error: unknown, fallback?: string): string {
  const data = (error as { data?: ConvexErrorData } | null)?.data;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed) return trimmed;
  }

  if (data && typeof data === "object") {
    const message = typeof data.message === "string" ? data.message.trim() : "";
    if (message) return message;
  }

  return fallback ?? DEFAULT_MESSAGE;
}

/**
 * The application code on a ConvexError, when the caller needs to branch on a specific failure
 * (checkout treats a stale cart price differently from a generic payment failure).
 */
export function getCustomerErrorCode(error: unknown): string | undefined {
  const data = (error as { data?: ConvexErrorData } | null)?.data;
  if (data && typeof data === "object" && typeof data.code === "string") {
    return data.code;
  }
  return undefined;
}
