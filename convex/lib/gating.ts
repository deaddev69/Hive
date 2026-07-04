import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getBoutiqueStatus } from "../shared/boutiqueStatus";

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

  const status = getBoutiqueStatus(boutique, Date.now());
  return status.type !== "OPEN";
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
  const status = getBoutiqueStatus(boutique, Date.now());
  if (status.type === "PAUSED" && status.reason === "capacity_limit") {
    throw new Error(
      `The boutique "${boutique.boutiqueName || boutique.name}" is temporarily unavailable as it has reached its daily order capacity of ${boutique.dailyOrderLimit} orders for today.`
    );
  }
}

