// convex/lib/porterSync.ts
// Reading Porter's Track Order response.
//
// Two things went wrong here in production, and they compounded.
//
// First, the shape. Porter's booking webhooks carry the rider under
// `driver_details`, but its Track Order API returns the same rider under
// `partner_info`, with the phone nested as `mobile.mobile_number` and the plate
// as `vehicle_number`. The sync only ever looked for `driver_details`, so it
// read a live response containing a rider's full details and extracted nothing.
//
// Second, the trigger. The sync was called from exactly one place — inside the
// webhook handler. When webhooks stopped arriving, nothing polled, and Hive had
// no idea a rider had been assigned, collected the parcel, or delivered it.
// Twenty-four shipments went out with a real courier and Hive recorded no event
// for any of them.
//
// The status here is read from `order_timings` rather than the status string.
// The timings are unambiguous and observed — a set `order_started_time` means
// the trip started, whatever Porter happens to call that state this month —
// whereas the string vocabulary ("accepted", "live", …) is only partly known.

export type PorterPartner = {
  name?: string;
  phone?: string;
  vehiclePlate?: string;
  lat?: number;
  lng?: number;
};

/** Porter nests the rider's number and uses a bare country code. */
export function extractPartnerPhone(mobile: any): string | undefined {
  if (!mobile) return undefined;
  if (typeof mobile === "string") return mobile.trim() || undefined;
  const number =
    mobile.mobile_number ?? mobile.number ?? mobile.phone_number ?? mobile.mobile;
  if (typeof number !== "string" || !number.trim()) return undefined;
  return number.trim();
}

/**
 * The rider, from whichever shape this response uses.
 *
 * `partner_info` is what the Track Order API returns; `driver_details` is the
 * webhook's name for the same thing. Both are read so one code path serves the
 * poll and the webhook.
 */
export function extractPartnerInfo(raw: any): PorterPartner | null {
  const source =
    raw?.partner_info ?? raw?.order_details?.driver_details ?? raw?.driver_details ?? null;
  if (!source) return null;

  const partner: PorterPartner = {};
  const name = source.name ?? source.driver_name;
  if (typeof name === "string" && name.trim()) partner.name = name.trim();

  const phone = extractPartnerPhone(source.mobile ?? source.phone);
  if (phone) partner.phone = phone;

  const plate = source.vehicle_number ?? source.vehiclePlate;
  if (typeof plate === "string" && plate.trim()) partner.vehiclePlate = plate.trim();

  const lat = source.location?.lat;
  const lng = source.location?.long ?? source.location?.lng;
  if (typeof lat === "number") partner.lat = lat;
  if (typeof lng === "number") partner.lng = lng;

  return Object.keys(partner).length > 0 ? partner : null;
}

/** Porter reports seconds; Hive works in milliseconds. */
export function porterSecondsToMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value < 1e12 ? Math.round(value * 1000) : Math.round(value);
}

export type PorterSyncStatus =
  | "created"
  | "driver_assigned"
  | "in_transit"
  | "delivered"
  | "failed";

export type PorterSyncView = {
  status: PorterSyncStatus;
  acceptedAt: number | null;
  startedAt: number | null;
  endedAt: number | null;
  /** Porter's own fare once the trip is done, in paise. */
  actualFarePaise: number | null;
  estimatedFarePaise: number | null;
  partner: PorterPartner | null;
};

/** Status strings Porter uses for a job that will never complete. */
const DEAD_STATUSES = new Set(["cancelled", "canceled", "cancel", "rejected", "expired"]);

/**
 * What this Track Order response says has happened.
 *
 * Read from the timings, most-progressed first, so a response that arrives out
 * of order can never walk a shipment backwards.
 */
export function resolvePorterSyncView(raw: any): PorterSyncView {
  const timings = raw?.order_timings ?? {};
  const acceptedAt = porterSecondsToMs(timings.order_accepted_time);
  const startedAt = porterSecondsToMs(timings.order_started_time);
  const endedAt = porterSecondsToMs(timings.order_ended_time);

  const rawStatus = typeof raw?.status === "string" ? raw.status.toLowerCase() : "";

  let status: PorterSyncStatus;
  if (endedAt) status = "delivered";
  else if (DEAD_STATUSES.has(rawStatus)) status = "failed";
  else if (startedAt) status = "in_transit";
  else if (acceptedAt) status = "driver_assigned";
  else status = "created";

  const actual = raw?.fare_details?.actual_fare_details?.minor_amount;
  const estimated = raw?.fare_details?.estimated_fare_details?.minor_amount;

  return {
    status,
    acceptedAt,
    startedAt,
    endedAt,
    actualFarePaise: typeof actual === "number" && actual > 0 ? actual : null,
    estimatedFarePaise: typeof estimated === "number" && estimated > 0 ? estimated : null,
    partner: extractPartnerInfo(raw),
  };
}

/**
 * Shipment states where the job is over and polling Porter is wasted effort.
 */
export const TERMINAL_SHIPMENT_STATUSES = new Set([
  "delivered",
  "failed",
  "cancelled",
  "returned",
  "rto_delivered",
  "lost",
]);

/** Whether a shipment is still worth asking Porter about. */
export function shouldPollShipment(shipment: {
  awbNumber?: string | null;
  status?: string | null;
}): boolean {
  const crn = (shipment.awbNumber ?? "").trim().toUpperCase();
  if (!crn || crn === "PENDING") return false;
  return !TERMINAL_SHIPMENT_STATUSES.has(shipment.status ?? "");
}

/**
 * How far along a shipment is, so a poll can tell what it has already passed.
 *
 * Only the ordering matters, not the numbers.
 */
const SHIPMENT_RANK: Record<string, number> = {
  created: 0,
  booking_failed: 0,
  booking_requested: 1,
  booking_confirmed: 2,
  pickup_scheduled: 2,
  driver_assigned: 3,
  driver_arrived: 4,
  picked_up: 5,
  in_transit: 6,
  out_for_delivery: 7,
  delivered: 8,
};

export type PorterProgressionStep = {
  status: PorterSyncStatus;
  /** Porter's own time for this transition, when it gave one. */
  at: number | null;
};

/**
 * The transitions needed to bring a shipment up to what Porter reports.
 *
 * A poll can arrive long after several transitions have happened — a rider was
 * assigned AND started the trip while Hive heard nothing — and the shipment
 * state machine refuses a jump from `booking_requested` straight to
 * `in_transit`. So the poll walks the states Porter's own timings prove
 * happened, skipping the ones the shipment has already passed.
 */
export function resolvePorterProgression(
  currentStatus: string,
  view: PorterSyncView
): PorterProgressionStep[] {
  if (view.status === "failed") {
    return currentStatus === "failed" ? [] : [{ status: "failed", at: null }];
  }

  const currentRank = SHIPMENT_RANK[currentStatus] ?? 0;
  const candidates: PorterProgressionStep[] = [];

  if (view.acceptedAt) candidates.push({ status: "driver_assigned", at: view.acceptedAt });
  if (view.startedAt) candidates.push({ status: "in_transit", at: view.startedAt });
  if (view.endedAt) candidates.push({ status: "delivered", at: view.endedAt });

  return candidates.filter((step) => (SHIPMENT_RANK[step.status] ?? 0) > currentRank);
}
