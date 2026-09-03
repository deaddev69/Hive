import {
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  safeGetJSON,
} from "./safeStorage";

/**
 * Regression tests for fault-tolerant localStorage access.
 *
 * The production fault this guards against: on a browser configured to block
 * site data, reading the `window.localStorage` property itself throws a
 * SecurityError. Every reader in the customer app runs inside a `useEffect` in
 * a root-layout provider, so that throw escaped React's passive-effect commit
 * and took the whole page down instead of degrading it.
 *
 * The `typeof window !== "undefined"` guard that used to protect these call
 * sites does not help: `window` exists in those browsers. Only a try/catch
 * around the property access does. These tests therefore install a `window`
 * whose `localStorage` getter throws, which is exactly what the real browser
 * does, rather than one whose methods throw.
 */
export function runSafeStorageTests() {
  let passed = 0;
  let failed = 0;

  function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual) ?? "undefined";
    const e = JSON.stringify(expected) ?? "undefined";
    if (a === e) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}\n         expected ${e}\n         got      ${a}`);
    }
  }

  /** Asserts the callback returns rather than propagating a throw. */
  function checkNoThrow(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`[FAIL] ${name}\n         threw ${String(err)}`);
    }
  }

  const globals = globalThis as Record<string, unknown>;
  const hadWindow = "window" in globals;
  const originalWindow = globals.window;

  /** Replaces the global `window` for the duration of one scenario. */
  function withWindow(define: (target: object) => void, body: () => void) {
    const win = {};
    define(win);
    globals.window = win;
    try {
      body();
    } finally {
      if (hadWindow) globals.window = originalWindow;
      else delete globals.window;
    }
  }

  // ── No window at all (server rendering) ──────────────────────────────────
  if (hadWindow) delete globals.window;
  check("getItem returns null when window is undefined", safeGetItem("k"), null);
  check("getJSON returns null when window is undefined", safeGetJSON("k"), null);
  checkNoThrow("setItem is inert when window is undefined", () => safeSetItem("k", "v"));
  checkNoThrow("removeItem is inert when window is undefined", () => safeRemoveItem("k"));
  if (hadWindow) globals.window = originalWindow;

  // ── The production fault: the property getter itself throws ──────────────
  const throwingStorage = (target: object) => {
    Object.defineProperty(target, "localStorage", {
      get() {
        throw new DOMException(
          "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
          "SecurityError"
        );
      },
      configurable: true,
    });
  };

  withWindow(throwingStorage, () => {
    check("getItem returns null when the property access throws", safeGetItem("k"), null);
    check("getJSON returns null when the property access throws", safeGetJSON("k"), null);
    checkNoThrow("setItem swallows a SecurityError", () => safeSetItem("k", "v"));
    checkNoThrow("removeItem swallows a SecurityError", () => safeRemoveItem("k"));
  });

  // ── Quota exhaustion: the property reads, but the write throws ───────────
  withWindow(
    (target) => {
      Object.defineProperty(target, "localStorage", {
        value: {
          getItem: () => null,
          setItem: () => {
            throw new DOMException("QuotaExceededError", "QuotaExceededError");
          },
          removeItem: () => {
            throw new DOMException("QuotaExceededError", "QuotaExceededError");
          },
        },
        configurable: true,
      });
    },
    () => {
      checkNoThrow("setItem swallows a quota error", () => safeSetItem("k", "v"));
      checkNoThrow("removeItem swallows a quota error", () => safeRemoveItem("k"));
    }
  );

  // ── Working storage still behaves exactly as before the migration ────────
  withWindow(
    (target) => {
      const store = new Map<string, string>();
      Object.defineProperty(target, "localStorage", {
        value: {
          getItem: (k: string) => (store.has(k) ? store.get(k) : null),
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        },
        configurable: true,
      });
    },
    () => {
      check("getItem returns null for an absent key", safeGetItem("absent"), null);
      safeSetItem("hive_guest", "true");
      check("getItem reads back what setItem wrote", safeGetItem("hive_guest"), "true");
      safeRemoveItem("hive_guest");
      check("getItem returns null after removeItem", safeGetItem("hive_guest"), null);

      safeSetItem("hive_location", JSON.stringify({ pincode: "682001" }));
      check(
        "getJSON parses a stored object",
        safeGetJSON<{ pincode: string }>("hive_location"),
        { pincode: "682001" }
      );

      safeSetItem("corrupt", "{not json");
      check("getJSON returns null for malformed JSON", safeGetJSON("corrupt"), null);
    }
  );

  console.log(`\nSafe storage: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("safeStorage.test")) {
  const { failed } = runSafeStorageTests();
  if (failed > 0) process.exit(1);
}
