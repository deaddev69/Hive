// Development-only timing markers for the customer phone-OTP / Google auth flow.
// Never log OTP codes, ID tokens, refresh tokens, or full phone numbers here — timing only.
//
// This exists to answer one question with numbers instead of guesswork: where does the
// "authentication feels slow" time actually go — Firebase SDK/reCAPTCHA, SMS delivery (outside
// our control), or the Firebase→Convex user sync happening after Firebase already confirmed the
// customer? See docs/customer-authentication.md once the audit is complete.
const ENABLED = process.env.NODE_ENV !== "production";

export function authPerfLog(label: string): void {
  if (!ENABLED) return;
  // eslint-disable-next-line no-console
  console.log(`[AUTH][PERF] ${label}: ${performance.now().toFixed(2)}ms`);
}

// A handful of stages happen in a different component/module than the one that started the
// flow (e.g. "Send OTP" is pressed in FirebaseAuthCard, but "customer UI authenticated" is
// observed in SessionContext). `window` is already how this codebase threads one-shot perf
// flags across component boundaries (see ProductCard's __perfLoggedFirstImage) — reused here
// for consistency rather than introducing a second pattern.
declare global {
  interface Window {
    __authFlowStartedAt?: number;
    __authFlowTotalLogged?: boolean;
  }
}

export function markAuthFlowStart(): void {
  if (!ENABLED || typeof window === "undefined") return;
  window.__authFlowStartedAt = performance.now();
  window.__authFlowTotalLogged = false;
}

export function logAuthFlowTotalOnce(label: string): void {
  if (!ENABLED || typeof window === "undefined") return;
  if (window.__authFlowStartedAt === undefined || window.__authFlowTotalLogged) return;
  window.__authFlowTotalLogged = true;
  const total = performance.now() - window.__authFlowStartedAt;
  // eslint-disable-next-line no-console
  console.log(`[AUTH][PERF] ${label}: ${total.toFixed(2)}ms (total from Send OTP press)`);
}
