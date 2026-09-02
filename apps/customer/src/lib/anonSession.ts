/**
 * A stable, anonymous, per-browser identifier used to scope rate limits.
 *
 * Server-side rate limiting buckets anonymous callers by this value
 * (convex/products.ts checkSearchRateLimitInternal). Without one, every
 * anonymous visitor shares a single "global" bucket — which is both a hot
 * write document and a shared ceiling, so ~30 searches a minute from anywhere
 * on the platform would lock search for every signed-out shopper at once.
 *
 * This identifies a browser, nothing else. It is random, carries no personal
 * information, and is never sent anywhere except as a rate-limit bucket key.
 */

const STORAGE_KEY = "hive_anon_session";

/**
 * Set when localStorage is unavailable (private mode, blocked site data, an
 * embedded webview). The visitor still gets an identifier that is unique to
 * them, so they are isolated from everyone else's rate limit — it just resets
 * on reload rather than persisting. That is a strictly better failure mode than
 * falling back to the shared bucket.
 */
let inMemoryId: string | null = null;

/** Random v4-shaped id. crypto.randomUUID needs a secure context, so fall back. */
function generateId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      // RFC 4122 version and variant bits. Read into locals first: the repo
      // compiles with noUncheckedIndexedAccess, so an indexed read is
      // `number | undefined` even on a fixed-length Uint8Array.
      const versionByte = bytes[6] ?? 0;
      const variantByte = bytes[8] ?? 0;
      bytes[6] = (versionByte & 0x0f) | 0x40;
      bytes[8] = (variantByte & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  } catch {
    // fall through
  }
  // Last resort — only reached with no Web Crypto at all. Not used for anything
  // security-sensitive; it only needs to differ between concurrent visitors.
  return `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Returns this browser's anonymous id, creating and persisting one on first
 * call. Returns undefined during server rendering, where there is no browser to
 * identify — callers pass the result straight through as an optional argument.
 */
export function getAnonSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  if (inMemoryId) return inMemoryId;

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      inMemoryId = existing;
      return existing;
    }
    const created = generateId();
    window.localStorage.setItem(STORAGE_KEY, created);
    inMemoryId = created;
    return created;
  } catch {
    // localStorage unavailable or full — keep a per-page-load id instead.
    inMemoryId = generateId();
    return inMemoryId;
  }
}
