import {
  resolveBookingDecision,
  hasRealBooking,
  porterRequestId,
  REBOOKABLE_STATUSES,
} from "../lib/porterBooking";

/**
 * Regression tests for the duplicate-booking guard.
 *
 * The bug these guard against: every dispatch path reuses the same shipment
 * row, and the booking action generated a fresh random `request_id` on each
 * call. A retry, a double-click or a second scheduler run therefore dispatched
 * a second real rider, billed the trip twice, and overwrote the first CRN so
 * the original booking could not be found again.
 */
export async function runPorterBookingTests() {
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

  // ── What counts as an existing booking ───────────────────────────────────
  check("An empty AWB is not a booking", hasRealBooking(""), false);
  check("Whitespace is not a booking", hasRealBooking("   "), false);
  check("The PENDING placeholder is not a booking", hasRealBooking("PENDING"), false);
  check("Lowercase pending is not a booking", hasRealBooking("pending"), false);
  check("A missing AWB is not a booking", hasRealBooking(undefined), false);
  check("A real CRN is a booking", hasRealBooking("CRN54266384"), true);

  // ── A fresh shipment books ───────────────────────────────────────────────
  check(
    "A shipment with no CRN books",
    resolveBookingDecision({ awbNumber: "", status: "created" }),
    { action: "book", deadCrn: null }
  );
  check(
    "A shipment holding the PENDING placeholder books",
    resolveBookingDecision({ awbNumber: "PENDING", status: "booking_requested" }),
    { action: "book", deadCrn: null }
  );

  // ── An existing booking is never sent twice ──────────────────────────────
  const live = [
    "booking_requested",
    "booking_confirmed",
    "driver_assigned",
    "driver_arrived",
    "pickup_scheduled",
    "picked_up",
    "in_transit",
    "out_for_delivery",
    "delivered",
  ];
  for (const status of live) {
    const decision = resolveBookingDecision({ awbNumber: "CRN54266384", status });
    check(`A booked shipment in ${status} is skipped`, decision.action, "skip");
    if (decision.action === "skip") {
      check(`The existing CRN is returned for ${status}`, decision.crn, "CRN54266384");
    }
  }

  // ── A dead booking is replaced, and the request id changes with it ───────
  for (const status of ["booking_failed", "failed", "cancelled"]) {
    check(
      `A ${status} shipment re-books, carrying the dead CRN`,
      resolveBookingDecision({ awbNumber: "CRN54266384", status }),
      { action: "book", deadCrn: "CRN54266384" }
    );
  }
  check(
    "Only the three dead states are re-bookable",
    [...REBOOKABLE_STATUSES].sort(),
    ["booking_failed", "cancelled", "failed"]
  );

  // ── Request ids ──────────────────────────────────────────────────────────
  const shipment = "k17abc9def0123456789";
  const first = await porterRequestId(shipment, null);
  const again = await porterRequestId(shipment, null);

  check("A request id is 32 characters, as Porter requires", first.length, 32);
  check("A request id is hex", /^[0-9a-f]{32}$/.test(first), true);
  check("The same shipment repeats the same request id", again, first);

  const other = await porterRequestId("k17zzz9def0123456789", null);
  check("A different shipment gets a different request id", other === first, false);

  const afterFailure = await porterRequestId(shipment, "CRN54266384");
  check(
    "Re-booking after a failure uses a distinct request id",
    afterFailure === first,
    false
  );
  check(
    "That replacement id is itself stable",
    await porterRequestId(shipment, "CRN54266384"),
    afterFailure
  );
  check(
    "A second failure produces a third distinct id",
    (await porterRequestId(shipment, "CRN99999999")) === afterFailure,
    false
  );

  // ── The scenario that cost real money ────────────────────────────────────
  // Seller taps dispatch, it succeeds, the UI does not update, they tap again.
  const booked = { awbNumber: "CRN54266384", status: "booking_requested" };
  check("Double-tap dispatch books once", resolveBookingDecision(booked).action, "skip");
  check(
    "The retry button on an already-booked order books once",
    resolveBookingDecision({ awbNumber: "CRN54266384", status: "driver_assigned" }).action,
    "skip"
  );
  check(
    "A retry after a genuine booking failure does book",
    resolveBookingDecision({ awbNumber: "CRN54266384", status: "booking_failed" }).action,
    "book"
  );

  console.log(`\nPorter booking: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("porterBookingTest")) {
  runPorterBookingTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
