import { getBoutiqueStatus } from "../shared/boutiqueStatus";

/**
 * Regression tests for store opening hours.
 *
 * The bug this guards against: opening and closing times were compared as plain
 * strings, which silently breaks any shift that runs past midnight. A store set
 * to 09:00-03:50 read as CLOSED at nearly every hour of the day, so its whole
 * catalogue showed "Reserve for tomorrow" instead of being buyable.
 */
export function runBoutiqueHoursTests() {
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

  /** Build an epoch for a given IST wall-clock time on a Wednesday. */
  function istTime(hhmm: string): number {
    const [h = 0, m = 0] = hhmm.split(":").map(Number);
    // 2026-09-02 is a Wednesday. IST is UTC+5:30.
    return Date.UTC(2026, 8, 2, h - 5, m - 30, 0);
  }

  const allDaysOpen = { weeklyClosedDays: [] as number[] };

  // ── Overnight shift: 09:00 -> 03:50 next day ─────────────────────────────
  const overnight = { ...allDaysOpen, openingTime: "09:00", closingTime: "03:50" };

  for (const t of ["09:00", "12:00", "18:30", "21:00", "23:59"]) {
    check(
      `Overnight 09:00-03:50 is OPEN at ${t}`,
      getBoutiqueStatus(overnight, istTime(t)).type,
      "OPEN"
    );
  }

  for (const t of ["00:30", "02:00", "03:49"]) {
    check(
      `Overnight 09:00-03:50 is still OPEN at ${t} (after midnight)`,
      getBoutiqueStatus(overnight, istTime(t)).type,
      "OPEN"
    );
  }

  for (const t of ["03:50", "05:00", "08:59"]) {
    check(
      `Overnight 09:00-03:50 is CLOSED at ${t} (between close and open)`,
      getBoutiqueStatus(overnight, istTime(t)).type,
      "CLOSED_TODAY"
    );
  }

  // ── Ordinary same-day shift still behaves ────────────────────────────────
  const sameDay = { ...allDaysOpen, openingTime: "09:00", closingTime: "20:00" };

  check("Same-day 09:00-20:00 is CLOSED at 08:59", getBoutiqueStatus(sameDay, istTime("08:59")).type, "CLOSED_TODAY");
  check("Same-day 09:00-20:00 is OPEN at 09:00", getBoutiqueStatus(sameDay, istTime("09:00")).type, "OPEN");
  check("Same-day 09:00-20:00 is OPEN at 19:59", getBoutiqueStatus(sameDay, istTime("19:59")).type, "OPEN");
  check("Same-day 09:00-20:00 is CLOSED at 20:00", getBoutiqueStatus(sameDay, istTime("20:00")).type, "CLOSED_TODAY");

  // ── Late-night close that does not wrap ──────────────────────────────────
  const late = { ...allDaysOpen, openingTime: "09:00", closingTime: "23:50" };
  check("09:00-23:50 is OPEN at 23:00", getBoutiqueStatus(late, istTime("23:00")).type, "OPEN");
  check("09:00-23:50 is CLOSED at 23:55", getBoutiqueStatus(late, istTime("23:55")).type, "CLOSED_TODAY");

  // ── A 24-hour store (open == close) reads as always open ────────────────
  const allDay = { ...allDaysOpen, openingTime: "00:00", closingTime: "00:00" };
  for (const t of ["00:00", "06:00", "13:37", "23:59"]) {
    check(`24h store is OPEN at ${t}`, getBoutiqueStatus(allDay, istTime(t)).type, "OPEN");
  }

  // ── Manual overrides still win over the clock ───────────────────────────
  check(
    "Manually paused store is PAUSED even inside opening hours",
    getBoutiqueStatus({ ...overnight, isAcceptingOrders: false }, istTime("12:00")).type,
    "PAUSED"
  );

  check(
    "Vacation mode is PAUSED even inside opening hours",
    getBoutiqueStatus(
      { ...overnight, storeStatus: "closed", pauseReason: "vacation" },
      istTime("12:00")
    ).type,
    "PAUSED"
  );

  // ── Incomplete profiles fail open rather than blocking sales ────────────
  check(
    "Store with no opening time configured stays OPEN",
    getBoutiqueStatus({ ...allDaysOpen, closingTime: "20:00" }, istTime("22:00")).type,
    "OPEN"
  );

  console.log(`\nBoutique hours: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("boutiqueHoursTest")) {
  const { failed } = runBoutiqueHoursTests();
  if (failed > 0) process.exit(1);
}
