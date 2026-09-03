/**
 * Fault-tolerant localStorage access.
 *
 * A browser configured to block site data — Chrome for Android with "Block all
 * cookies", some managed devices, some embedded WebViews — does not merely
 * return null from `getItem`. Reading the `window.localStorage` **property**
 * throws:
 *
 *   SecurityError: Failed to read the 'localStorage' property from 'Window':
 *   Access is denied for this document.
 *
 * That is why `typeof window !== "undefined"` is not a sufficient guard: it
 * only covers server rendering. `window` exists in these browsers; it is the
 * property access that fails. Only a try/catch around the access helps.
 *
 * This matters beyond losing a preference. Every reader in the customer app
 * runs inside a `useEffect` in a provider mounted by the root layout, so an
 * uncaught SecurityError escapes React's passive-effect commit and reaches
 * `window.onerror` — taking the page down rather than degrading it.
 *
 * Writes need the same treatment: `setItem` throws under the same restriction
 * and additionally when the storage quota is exhausted.
 *
 * The contract here is deliberately quiet: reads return null when storage is
 * unavailable, writes and removals do nothing. Callers then fall through to the
 * same defaults they already use when a key is simply absent, so a shopper with
 * blocked storage gets a working site without persistence rather than a broken
 * one.
 *
 * Nothing is logged. These calls carry phone numbers, addresses, search history
 * and session state, and a storage failure is an expected browser configuration
 * rather than a defect worth reporting.
 *
 * lib/anonSession.ts implements this same pattern inline for its own key and is
 * left as-is; it predates this helper and already behaves correctly.
 */

/** Reads a key. Returns null when storage is unavailable or the key is absent. */
export function safeGetItem(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a key. Does nothing when storage is unavailable or the quota is full. */
export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable or full — the caller continues without persistence.
  }
}

/** Removes a key. Does nothing when storage is unavailable. */
export function safeRemoveItem(key: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to remove.
  }
}

/**
 * Reads and JSON-parses a key, returning null on unavailable storage, a missing
 * key, or malformed JSON. Several callers hand-rolled this combination with a
 * try/catch around the parse only, which left the read itself unguarded.
 */
export function safeGetJSON<T>(key: string): T | null {
  const raw = safeGetItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
