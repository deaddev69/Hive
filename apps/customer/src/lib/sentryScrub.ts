/**
 * Redaction applied to every Sentry event before it leaves the device or server.
 *
 * Hive handles phone-number OTP sign-in, delivery addresses and Razorpay
 * checkout, so an unfiltered error report can easily carry a customer's phone
 * number, a one-time code, or payment identifiers. Sentry's own defaults do not
 * know about these field names, so the scrubbing is explicit and deny-by-key
 * rather than allow-by-key: an unrecognised field is kept, a recognised
 * sensitive one is replaced.
 *
 * `sendDefaultPii` is left off in the configs that use this, so IP addresses and
 * request bodies are not attached in the first place. This is the second layer.
 */

/** Substrings that mark a key as sensitive. Matched case-insensitively. */
const SENSITIVE_KEY_PATTERNS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "auth",
  "cookie",
  "session",
  "otp",
  "pin",
  "cvv",
  "cvc",
  "card",
  "cardnumber",
  "upi",
  "vpa",
  "razorpay_signature",
  "phone",
  "mobile",
  "contact",
  "email",
  "aadhaar",
  "pan",
  "gst",
  "accountnumber",
  "account_number",
  "ifsc",
  "bank",
];

const REDACTED = "[redacted]";

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p.replace(/[^a-z0-9_]/g, "")));
}

/** Values that look like secrets regardless of the key they sit under. */
function redactValuePatterns(value: string): string {
  return (
    value
      // Indian mobile numbers, with or without +91.
      .replace(/(\+?91[\-\s]?)?[6-9]\d{9}\b/g, REDACTED)
      // Bare 4-8 digit codes (OTPs).
      .replace(/\b\d{4,8}\b(?=\s*(otp|code|pin))/gi, REDACTED)
      // Email addresses.
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, REDACTED)
      // Bearer tokens and long opaque keys.
      .replace(/\b(Bearer\s+)?[A-Za-z0-9_-]{32,}\b/g, (m) =>
        /^[0-9]+$/.test(m) ? m : REDACTED
      )
  );
}

/** Recursively redacts an arbitrary structure. Depth-capped to avoid cycles. */
export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 8) return value;

  if (typeof value === "string") return redactValuePatterns(value);
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveKey(k) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

/**
 * The subset of a Sentry event this scrubber touches. Structural rather than
 * imported from the SDK so the module stays dependency-free and usable from the
 * client, server and edge configs alike.
 */
interface ScrubbableEvent {
  request?: {
    url?: string;
    cookies?: unknown;
    data?: unknown;
    headers?: Record<string, string>;
    [k: string]: unknown;
  };
  user?: { id?: string; [k: string]: unknown };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: Array<{ message?: string; data?: unknown; [k: string]: unknown }>;
  [k: string]: unknown;
}

/**
 * Sentry `beforeSend` / `beforeSendTransaction` hook.
 * Returns the event with sensitive fields removed, or null to drop it entirely.
 */
export function scrubEvent<T extends object>(eventInput: T): T | null {
  if (!eventInput) return eventInput;

  // Sentry's ErrorEvent/TransactionEvent are nominally distinct and lack an
  // index signature, so they are narrowed here rather than in the signature —
  // that keeps this module free of an SDK import and lets the same function
  // serve beforeSend and beforeSendTransaction in all three runtimes.
  const event = eventInput as ScrubbableEvent;

  // Query strings can carry a phone number or an OTP on the sign-in route.
  if (event.request) {
    if (typeof event.request.url === "string") {
      event.request.url = event.request.url.split("?")[0];
    }
    delete event.request.cookies;
    delete event.request.data;
    if (event.request.headers) {
      event.request.headers = scrub(event.request.headers, 0) as Record<string, string>;
    }
  }

  // Never attach an identifiable user; an opaque id is enough to group errors.
  if (event.user) {
    event.user = { id: event.user.id };
  }

  if (event.extra) event.extra = scrub(event.extra, 0) as Record<string, unknown>;
  if (event.contexts) event.contexts = scrub(event.contexts, 0) as Record<string, unknown>;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b: any) => ({
      ...b,
      message: typeof b.message === "string" ? redactValuePatterns(b.message) : b.message,
      data: b.data ? scrub(b.data, 0) : b.data,
    }));
  }

  return eventInput;
}
