// convex/lib/killSwitches.ts
// Platform Kill Switches helper function.
// Queries the systemConfig table to gate checkout, orders, or payment initialization.

import { DatabaseReader } from "../_generated/server";

export async function checkKillSwitch(
  db: DatabaseReader,
  key: "maintenanceMode" | "ordersEnabled" | "checkoutEnabled" | "paymentsEnabled"
): Promise<boolean> {
  const config = await db
    .query("systemConfig")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!config) {
    // Default safe fallbacks if the config keys are not seeded
    if (key === "maintenanceMode") return false;
    return true; // ordersEnabled, checkoutEnabled, paymentsEnabled default to active
  }

  return config.value;
}
