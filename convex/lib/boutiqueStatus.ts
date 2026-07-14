// convex/lib/boutiqueStatus.ts
// Dynamic resolved status calculator for boutiques based on calendar, vacation modes, and real-time capacity.

import { DatabaseReader } from "../_generated/server";

export async function resolveBoutiqueStatus(db: DatabaseReader, boutique: any) {
  const nowUtc = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc + istOffset);
  const dayOfWeekIst = nowIst.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dateStrIst = nowIst.toISOString().split("T")[0]; // YYYY-MM-DD

  // 1. Weekly Closed Days
  if (boutique.weeklyClosedDays?.includes(dayOfWeekIst)) {
    return {
      resolvedStatus: "closed",
      isOpen: false,
      isPaused: false,
      vacationMode: false,
      isAcceptingOrders: false,
      reason: "weekly_closed",
    };
  }

  // Legacy Operating Days check
  if (boutique.operatingDays && boutique.operatingDays.length > 0) {
    if (!boutique.operatingDays.includes(dayOfWeekIst)) {
      return {
        resolvedStatus: "closed",
        isOpen: false,
        isPaused: false,
        vacationMode: false,
        isAcceptingOrders: false,
        reason: "weekly_closed",
      };
    }
  }

  // 2. Holiday Calendar
  if (boutique.holidayDates?.includes(dateStrIst)) {
    return {
      resolvedStatus: "closed",
      isOpen: false,
      isPaused: false,
      vacationMode: false,
      isAcceptingOrders: false,
      reason: "holiday",
    };
  }

  // 3. Vacation Mode check (Manual closed with vacation reason)
  const isVacation = boutique.storeStatus === "closed" && boutique.pauseReason === "vacation";
  if (isVacation) {
    if (boutique.closedUntil && nowUtc >= boutique.closedUntil) {
      // Auto-reopen has triggered; fall through to evaluate normal status
    } else {
      return {
        resolvedStatus: "vacation",
        isOpen: false,
        isPaused: false,
        vacationMode: true,
        isAcceptingOrders: false,
        reason: "vacation",
      };
    }
  }

  // 4. Manual Closed state with auto-reopen guard
  if (boutique.storeStatus === "closed") {
    if (boutique.closedUntil && nowUtc >= boutique.closedUntil) {
      // Auto-reopen has triggered; fall through to evaluate normal status
    } else {
      return {
        resolvedStatus: "closed",
        isOpen: false,
        isPaused: false,
        vacationMode: false,
        isAcceptingOrders: false,
        reason: "manual_closed",
      };
    }
  }

  // 5. Acceptance Capacity Limit (maxActiveOrders check)
  // Uses the pre-computed activeOrdersToday/activeOrdersDate counter maintained by
  // boutiqueCounters.ts — O(1) read, no orders table scan needed.
  if (boutique.maxActiveOrders !== undefined && boutique.maxActiveOrders !== null) {
    const nowUtcForCapacity = Date.now();
    const istOffsetForCapacity = 5.5 * 60 * 60 * 1000;
    const todayIst = new Date(nowUtcForCapacity + istOffsetForCapacity).toISOString().split("T")[0];
    // If activeOrdersDate is stale (rolled over midnight) treat count as 0 — acceptable tradeoff.
    const activeInProgressCount =
      boutique.activeOrdersDate === todayIst ? (boutique.activeOrdersToday ?? 0) : 0;

    if (activeInProgressCount >= boutique.maxActiveOrders) {
      return {
        resolvedStatus: "paused",
        isOpen: false,
        isPaused: true,
        vacationMode: false,
        isAcceptingOrders: false,
        reason: "capacity_limit",
      };
    }
  }


  // 7. Manual Busy state
  if (boutique.storeStatus === "busy") {
    return {
      resolvedStatus: "paused",
      isOpen: true,
      isPaused: true,
      vacationMode: false,
      isAcceptingOrders: true,
      reason: "manual_busy",
    };
  }

  return {
    resolvedStatus: "open",
    isOpen: true,
    isPaused: false,
    vacationMode: false,
    isAcceptingOrders: true,
    reason: "normal",
  };
}
