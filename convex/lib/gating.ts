// convex/lib/gating.ts
// Operational gating for boutiques: Soft Launch, Store Hours, Operating Days, and Capacity Limits.

import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { resolveBoutiqueStatus } from "./boutiqueStatus";

export async function validateBoutiqueOperationalLimits(
  db: DatabaseReader,
  boutiqueId: Id<"boutiques">
): Promise<void> {
  const boutique = await db.get(boutiqueId);
  if (!boutique) {
    throw new Error("Boutique not found.");
  }

  // 1. Soft Launch / Orderable flag check
  if (boutique.isOrderable === false) {
    throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is not accepting orders at this time.`);
  }

  // Get current Indian Standard Time (IST) details
  // Convex runs in UTC, so we add the IST offset (+5:30) to compute local time.
  const nowUtc = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc + istOffset);

  const dayOfWeekIst = nowIst.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
  const hourIst = nowIst.getUTCHours();
  const minuteIst = nowIst.getUTCMinutes();
  const timeStringIst = `${String(hourIst).padStart(2, "0")}:${String(minuteIst).padStart(2, "0")}`;

  // 2. Store Hours check
  if (boutique.openingTime && boutique.closingTime) {
    if (timeStringIst < boutique.openingTime || timeStringIst > boutique.closingTime) {
      throw new Error(
        `The boutique "${boutique.boutiqueName || boutique.name}" is closed. Store hours: ${boutique.openingTime} - ${boutique.closingTime} (IST). Current time: ${timeStringIst} (IST).`
      );
    }
  }

  // 3. Resolve status using resolveBoutiqueStatus (handles Weekly Days, Holidays, Pause, Capacity)
  const { resolvedStatus, isAcceptingOrders, reason } = await resolveBoutiqueStatus(db, boutique);

  if (!isAcceptingOrders) {
    if (resolvedStatus === "closed") {
      let msg = boutique.storeMessage || `The boutique "${boutique.boutiqueName || boutique.name}" is closed at this time.`;
      if (reason === "weekly_closed") {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        msg = `The boutique "${boutique.boutiqueName || boutique.name}" is closed on ${dayNames[dayOfWeekIst]}s.`;
      } else if (reason === "holiday") {
        msg = `The boutique "${boutique.boutiqueName || boutique.name}" is closed today for a holiday.`;
      }
      throw new Error(msg);
    }
    if (resolvedStatus === "temporarily_unavailable") {
      throw new Error(
        `The boutique "${boutique.boutiqueName || boutique.name}" is temporarily unavailable as it has reached its daily order capacity of ${boutique.dailyOrderLimit} orders for today.`
      );
    }
  }
}

