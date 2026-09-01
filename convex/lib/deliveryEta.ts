// convex/lib/deliveryEta.ts
// Single source of truth for the delivery promise shown on a product card
// ("90-Min Delivery" / "Delivers Tomorrow" / "Express Delivery").
//
// This used to be computed client-side in ProductCard from `new Date().getHours()` against a
// hardcoded 9-20 window. That ignored everything that actually determines the promise:
//   - the boutique's own opening/closing times and weekly/holiday closures
//   - its prep time
//   - the real distance to the shopper (etaMinutes was computed server-side and never rendered)
// and it read the *shopper's device* clock, so anyone browsing from another timezone saw the
// wrong promise. Hive delivers in one city, so the window is evaluated in IST here instead.

/** Hive operates in Kochi; all delivery windows are India Standard Time regardless of device. */
const IST_OFFSET_MINUTES = 330; // UTC+5:30

/** Fallback service window when a boutique has not configured its own hours. */
const DEFAULT_OPEN_HOUR = 9;
const DEFAULT_CLOSE_HOUR = 20;

/** Same-day delivery is only promised when the whole trip fits comfortably before closing. */
const SAME_DAY_CUTOFF_BUFFER_MINUTES = 30;

export interface DeliveryLabelInput {
  /** Whether this product is flagged for same-day fulfilment at all. */
  sameDayEligible?: boolean;
  /** Round-trip estimate (travel + prep) from OperationsService, in minutes. */
  etaMinutes?: number;
  boutique?: {
    openingTime?: string;      // "HH:MM"
    closingTime?: string;      // "HH:MM"
    weeklyClosedDays?: number[]; // 0 = Sunday
    holidayDates?: string[];   // "YYYY-MM-DD"
    prepTimeMinutes?: number;
    isAcceptingOrders?: boolean;
  } | null;
}

/** Current wall-clock in IST, independent of server or device timezone. */
export function nowInIST(at: Date = new Date()): { hour: number; minute: number; minutesOfDay: number; day: number; dateKey: string } {
  const istMs = at.getTime() + IST_OFFSET_MINUTES * 60_000;
  const ist = new Date(istMs);
  const hour = ist.getUTCHours();
  const minute = ist.getUTCMinutes();
  return {
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
    day: ist.getUTCDay(),
    dateKey: ist.toISOString().slice(0, 10),
  };
}

function parseHHMM(value: string | undefined, fallbackHour: number): number {
  if (!value) return fallbackHour * 60;
  const [h, m] = value.split(":");
  const hour = Number(h);
  const minute = Number(m ?? 0);
  if (Number.isNaN(hour)) return fallbackHour * 60;
  return hour * 60 + (Number.isNaN(minute) ? 0 : minute);
}

/**
 * Resolves the delivery promise for one product. Returns null when the product should show no
 * delivery line at all.
 */
export function resolveDeliveryLabel(input: DeliveryLabelInput, at: Date = new Date()): string | null {
  const { etaMinutes, boutique } = input;

  // `sameDayEligible` is deliberately NOT consulted. It was never a real seller choice — both
  // boutique product forms carried it as dead state initialised to false with no UI attached, so
  // every product was written false by default and no seller could change it. Hive fulfils every
  // order through Porter under one platform-wide 90-minute promise, so same-day is a property of
  // the platform, not of an individual product. What genuinely varies is below: the boutique's
  // own hours, its closures, and how far the rider has to go.

  const now = nowInIST(at);

  // A boutique that is closed today cannot deliver today, whatever the hour.
  if (boutique?.weeklyClosedDays?.includes(now.day)) return "Delivers Tomorrow";
  if (boutique?.holidayDates?.includes(now.dateKey)) return "Delivers Tomorrow";
  if (boutique?.isAcceptingOrders === false) return "Delivers Tomorrow";

  const openMinutes = parseHHMM(boutique?.openingTime, DEFAULT_OPEN_HOUR);
  const closeMinutes = parseHHMM(boutique?.closingTime, DEFAULT_CLOSE_HOUR);

  // Before opening, or already closed.
  if (now.minutesOfDay < openMinutes || now.minutesOfDay >= closeMinutes) return "Delivers Tomorrow";

  // Inside opening hours: the order still has to be picked up and delivered before close.
  // Prefer the measured ETA (travel + prep) when OperationsService supplied one; fall back to
  // prep time alone when the shopper has set no location and no distance could be computed.
  const tripMinutes = etaMinutes ?? boutique?.prepTimeMinutes ?? 30;
  if (now.minutesOfDay + tripMinutes + SAME_DAY_CUTOFF_BUFFER_MINUTES > closeMinutes) {
    return "Delivers Tomorrow";
  }

  // Only claim 90 minutes when the estimate actually supports it.
  if (etaMinutes !== undefined && etaMinutes > 90) {
    return `Delivers in ~${Math.round(etaMinutes / 15) * 15} Mins`;
  }

  return "90-Min Delivery";
}
