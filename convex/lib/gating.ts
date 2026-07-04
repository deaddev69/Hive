// convex/lib/gating.ts
// Operational gating for boutiques: Soft Launch, Store Hours, Operating Days, and Capacity Limits.

import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { resolveBoutiqueStatus } from "./boutiqueStatus";

export async function checkBoutiqueClosedStatus(
  db: DatabaseReader,
  boutiqueId: Id<"boutiques">
): Promise<boolean> {
  const boutique = await db.get(boutiqueId);
  if (!boutique) return false;

  if (process.env.BYPASS_GATING === "true" || process.env.CONVEX_DEPLOYMENT?.startsWith("dev:")) {
    return false;
  }

  if (boutique.isOrderable === false) {
    return true;
  }

  const nowUtc = Date.now();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc + istOffset);
  const hourIst = nowIst.getUTCHours();
  const minuteIst = nowIst.getUTCMinutes();
  const timeStringIst = `${String(hourIst).padStart(2, "0")}:${String(minuteIst).padStart(2, "0")}`;

  if (boutique.openingTime && boutique.closingTime) {
    if (timeStringIst < boutique.openingTime || timeStringIst > boutique.closingTime) {
      return true;
    }
  }

  const { resolvedStatus, isAcceptingOrders } = await resolveBoutiqueStatus(db, boutique);
  if (!isAcceptingOrders && resolvedStatus === "closed") {
    return true;
  }

  return false;
}

export async function validateBoutiqueOperationalLimits(
  db: DatabaseReader,
  boutiqueId: Id<"boutiques">
): Promise<void> {
  const boutique = await db.get(boutiqueId);
  if (!boutique) {
    throw new Error("Boutique not found.");
  }

  if (process.env.BYPASS_GATING === "true" || process.env.CONVEX_DEPLOYMENT?.startsWith("dev:")) {
    console.warn(`[gating] Bypassing operational limits in development for boutique: ${boutique.name}`);
    return;
  }

  // 1. Soft Launch / Orderable flag check
  if (boutique.isOrderable === false) {
    throw new Error(`The boutique "${boutique.boutiqueName || boutique.name}" is not accepting orders at this time.`);
  }

  // We do NOT block/throw on closed hours/days (weekly closed or holiday) anymore.
  // Instead, the order is allowed to go through, and the placedDuringClosedHours flag will be set.
  // We only throw for daily order capacity limits.
  const { resolvedStatus, isAcceptingOrders } = await resolveBoutiqueStatus(db, boutique);
  if (!isAcceptingOrders && resolvedStatus === "temporarily_unavailable") {
    throw new Error(
      `The boutique "${boutique.boutiqueName || boutique.name}" is temporarily unavailable as it has reached its daily order capacity of ${boutique.dailyOrderLimit} orders for today.`
    );
  }
}

