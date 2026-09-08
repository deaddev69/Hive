// convex/lib/porterBooking.ts
// The rules that decide whether a Porter booking should actually be sent.
//
// Every dispatch path in Hive reuses the same shipment row, so a retry, a
// double-click, or a second scheduler run all reach the booking action with a
// shipment that may already carry a CRN. Before these rules existed the action
// generated a fresh random `request_id` each time, so Porter had no way to
// recognise the repeat: it dispatched a second real rider, billed the trip
// twice, and the new CRN overwrote the old one so the original booking could
// not even be found again.
//
// Kept separate from porter.ts so the decision can be tested without a Convex
// runtime or a network call.

/** What a booking attempt reports back, whether or not it called Porter. */
export type PorterBookingResult = {
  crn: string;
  trackingUrl: string | undefined;
  estimatedPickupTime: string | undefined;
  /** True when the shipment was already booked and Porter was not called. */
  alreadyBooked: boolean;
};

/**
 * A CRN that means a rider has actually been booked.
 *
 * The shipment row is written before Porter is called, so `awbNumber` starts
 * empty or as the "PENDING" placeholder that one call site uses.
 */
export function hasRealBooking(awbNumber: string | null | undefined): boolean {
  const value = (awbNumber ?? "").trim().toUpperCase();
  return value.length > 0 && value !== "PENDING";
}

/**
 * Shipment states where the existing booking is dead and re-booking is right.
 *
 * Anything else — including a booking still in flight — must not be re-sent.
 */
export const REBOOKABLE_STATUSES = new Set(["booking_failed", "failed", "cancelled"]);

export type BookingDecision =
  | { action: "book"; deadCrn: string | null }
  | { action: "skip"; crn: string; reason: string };

/**
 * Whether to send this booking to Porter.
 *
 * `book` carries the dead CRN when we are deliberately replacing a failed
 * booking, so the request id can be made distinct from the one that failed.
 */
export function resolveBookingDecision(shipment: {
  awbNumber: string | null | undefined;
  status: string;
}): BookingDecision {
  const booked = hasRealBooking(shipment.awbNumber);

  if (!booked) return { action: "book", deadCrn: null };

  if (REBOOKABLE_STATUSES.has(shipment.status)) {
    return { action: "book", deadCrn: (shipment.awbNumber ?? "").trim() };
  }

  return {
    action: "skip",
    crn: (shipment.awbNumber ?? "").trim(),
    reason: `shipment already booked (status ${shipment.status})`,
  };
}

/**
 * Porter's idempotency key for a booking request.
 *
 * Derived from the shipment so the same request is repeatable, with the dead
 * CRN folded in when we are genuinely re-booking after a failure — otherwise a
 * legitimate retry would just look up the cancelled order.
 */
export async function porterRequestId(
  shipmentId: string,
  deadCrn: string | null
): Promise<string> {
  const seed = deadCrn ? `${shipmentId}:${deadCrn}` : shipmentId;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32); // Porter caps request_id at 32 characters.
}
