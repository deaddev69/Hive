export interface BoutiqueStatusInput {
  isAcceptingOrders?: boolean;
  openingTime?: string; // e.g. "09:00"
  closingTime?: string; // e.g. "20:00"
  operatingDays?: number[]; // e.g. [1,2,3,4,5,6] (Monday=1, Sunday=0)
  holidayDates?: string[]; // e.g. ["2026-07-15"]
  status?: string; // e.g. "APPROVED"
  storeStatus?: string; // e.g. "open", "busy", "closed"
  pauseReason?: string;
  closedUntil?: number;
  maxActiveOrders?: number;
  activeOrdersToday?: number;
  activeOrdersDate?: string;
  dailyOrderLimit?: number;
}

export type BoutiqueStatus =
  | { type: "OPEN" }
  | { type: "CLOSED_TODAY"; nextOperatingDay: string; openingTime: string }
  | { type: "CLOSED_EXTENDED"; nextOperatingDay: string; openingTime: string }
  | { type: "PAUSED"; reason: "vacation" | "manual_paused" | "capacity_limit" };

function getNextOperatingDay(
  boutique: BoutiqueStatusInput,
  startFromMs: number
) {
  let currentCheckMs = startFromMs;
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(currentCheckMs + (5.5 * 60 * 60 * 1000));
    const day = checkDate.getUTCDay();

    const year = checkDate.getUTCFullYear();
    const month = String(checkDate.getUTCMonth() + 1).padStart(2, "0");
    const date = String(checkDate.getUTCDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${date}`;

    const isHoliday = boutique.holidayDates && boutique.holidayDates.includes(dateStr);
    const isOperatingDay = boutique.operatingDays && boutique.operatingDays.includes(day);

    if (!isHoliday && isOperatingDay) {
      return { dateStr, timeMs: currentCheckMs };
    }

    currentCheckMs += 24 * 60 * 60 * 1000;
  }

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000 + (5.5 * 60 * 60 * 1000));
  return {
    dateStr: `${tomorrow.getUTCFullYear()}-${String(tomorrow.getUTCMonth() + 1).padStart(2, "0")}-${String(tomorrow.getUTCDate()).padStart(2, "0")}`,
    timeMs: Date.now() + 24 * 60 * 60 * 1000
  };
}

export function getBoutiqueStatus(
  boutique: BoutiqueStatusInput,
  currentTimeMs: number = Date.now()
): BoutiqueStatus {
  // 1. Manual order acceptance check (Boutique settings manual toggle)
  if (boutique.isAcceptingOrders === false) {
    return { type: "PAUSED", reason: "manual_paused" };
  }

  // 2. Manual Vacation Mode check
  const isVacation = boutique.storeStatus === "closed" && boutique.pauseReason === "vacation";
  if (isVacation) {
    if (boutique.closedUntil && currentTimeMs >= boutique.closedUntil) {
      // Auto-reopen has triggered; allow checks to proceed
    } else {
      return { type: "PAUSED", reason: "vacation" };
    }
  }

  // 3. Manual Closed state with auto-reopen guard
  if (boutique.storeStatus === "closed") {
    if (boutique.closedUntil && currentTimeMs >= boutique.closedUntil) {
      // Auto-reopen has triggered; allow checks to proceed
    } else {
      return { type: "PAUSED", reason: "manual_paused" };
    }
  }

  // 4. Capacity limit checks (if order limits reached)
  const istDate = new Date(currentTimeMs + (5.5 * 60 * 60 * 1000));
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const currentDateStr = `${year}-${month}-${day}`;

  const activeCountToday = boutique.activeOrdersDate === currentDateStr ? (boutique.activeOrdersToday ?? 0) : 0;
  if (boutique.maxActiveOrders !== undefined && boutique.maxActiveOrders !== null) {
    if (activeCountToday >= boutique.maxActiveOrders) {
      return { type: "PAUSED", reason: "capacity_limit" };
    }
  }
  if (boutique.dailyOrderLimit !== undefined && boutique.dailyOrderLimit !== null) {
    if (activeCountToday >= boutique.dailyOrderLimit) {
      return { type: "PAUSED", reason: "capacity_limit" };
    }
  }

  // Fail-safe: if the profile is incomplete (missing openingTime or operatingDays), default to OPEN
  if (!boutique.openingTime || !boutique.operatingDays || boutique.operatingDays.length === 0) {
    return { type: "OPEN" };
  }

  const currentDay = istDate.getUTCDay();

  // 1. Check if today is a holiday
  if (boutique.holidayDates && boutique.holidayDates.includes(currentDateStr)) {
    const nextDay = getNextOperatingDay(boutique, currentTimeMs + 24 * 60 * 60 * 1000);
    return {
      type: "CLOSED_EXTENDED",
      nextOperatingDay: nextDay.dateStr,
      openingTime: boutique.openingTime,
    };
  }

  // 2. Check if today is an operating day
  if (!boutique.operatingDays.includes(currentDay)) {
    const nextDay = getNextOperatingDay(boutique, currentTimeMs + 24 * 60 * 60 * 1000);
    return {
      type: "CLOSED_EXTENDED",
      nextOperatingDay: nextDay.dateStr,
      openingTime: boutique.openingTime,
    };
  }

  // 3. Check business hours
  const currentHour = istDate.getUTCHours();
  const currentMin = istDate.getUTCMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

  // If before opening hours, they open later today
  if (currentTimeStr < boutique.openingTime) {
    return {
      type: "CLOSED_TODAY",
      nextOperatingDay: currentDateStr,
      openingTime: boutique.openingTime,
    };
  }

  // If past closing hours, they are closed for the day
  const closingTime = boutique.closingTime || "23:59";
  if (currentTimeStr >= closingTime) {
    const nextDay = getNextOperatingDay(boutique, currentTimeMs + 24 * 60 * 60 * 1000);
    
    // If next day is tomorrow, it's CLOSED_TODAY (Book for Tomorrow)
    // Otherwise it's CLOSED_EXTENDED (Book for [Day])
    const tomorrowDate = new Date(currentTimeMs + 24 * 60 * 60 * 1000 + (5.5 * 60 * 60 * 1000));
    const tomYear = tomorrowDate.getUTCFullYear();
    const tomMonth = String(tomorrowDate.getUTCMonth() + 1).padStart(2, "0");
    const tomDay = String(tomorrowDate.getUTCDate()).padStart(2, "0");
    const tomorrowDateStr = `${tomYear}-${tomMonth}-${tomDay}`;

    if (nextDay.dateStr === tomorrowDateStr) {
      return {
        type: "CLOSED_TODAY",
        nextOperatingDay: nextDay.dateStr,
        openingTime: boutique.openingTime,
      };
    } else {
      return {
        type: "CLOSED_EXTENDED",
        nextOperatingDay: nextDay.dateStr,
        openingTime: boutique.openingTime,
      };
    }
  }

  return { type: "OPEN" };
}
