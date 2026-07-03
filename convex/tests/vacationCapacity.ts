// convex/tests/vacationCapacity.ts
// Integration tests verifying boutique status resolution, weekly closed days, holiday dates,
// manual paused states (closedUntil auto-reopen), O(1) daily order capacity limits, and gating validations.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { resolveBoutiqueStatus } from "../lib/boutiqueStatus";
import { validateBoutiqueOperationalLimits } from "../lib/gating";
import { incrementBoutiqueOrderCount, decrementBoutiqueOrderCount } from "../lib/boutiqueCounters";

export const runVacationCapacityTests = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING VACATION MODE & CAPACITY CONTROL TESTS ===");
    const now = Date.now();

    // 1. Create a test boutique
    const boutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName: "Test Vacation Boutique",
      ownerName: "Test Owner",
      email: "testvacation@hive.com",
      phone: "+919876543210",
      address: "Banjara Hills, Hyderabad",
      latitude: 17.385,
      longitude: 78.487,
      deliveryRadiusKm: 15,
      description: "Test boutique for vacation and capacity limits",
      status: "APPROVED",
      ownerEmail: "testvacation@hive.com",
      createdAt: now,
    });

    const getB = async () => (await ctx.db.get(boutiqueId))!;

    // TEST 1: Default status is open
    console.log("Test 1: Default status resolution...");
    let b = await getB();
    let res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "open" || !res.isAcceptingOrders) {
      throw new Error(`FAIL: Expected open/accepting, got ${res.resolvedStatus}`);
    }
    console.log("✓ Test 1 Passed.");

    // TEST 2: Weekly Closed Days
    console.log("Test 2: Weekly closed days resolution...");
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(now + istOffset);
    const dayOfWeekIst = nowIst.getUTCDay();
    
    await ctx.db.patch(boutiqueId, { weeklyClosedDays: [dayOfWeekIst] });
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "closed" || res.isAcceptingOrders || res.reason !== "weekly_closed") {
      throw new Error(`FAIL: Expected closed/weekly_closed, got ${res.resolvedStatus}/${res.reason}`);
    }

    // Gating check
    try {
      await validateBoutiqueOperationalLimits(ctx.db, boutiqueId);
      throw new Error("FAIL: validateBoutiqueOperationalLimits should have blocked checkout on weekly closed day.");
    } catch (err: any) {
      console.log("✓ Expected block:", err.message);
    }

    // Reset weekly closed days
    await ctx.db.patch(boutiqueId, { weeklyClosedDays: [] });
    console.log("✓ Test 2 Passed.");

    // TEST 3: Holiday Dates
    console.log("Test 3: Holiday calendar dates...");
    const dateStrIst = nowIst.toISOString().split("T")[0] || "";
    await ctx.db.patch(boutiqueId, { holidayDates: [dateStrIst] });
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "closed" || res.isAcceptingOrders || res.reason !== "holiday") {
      throw new Error(`FAIL: Expected closed/holiday, got ${res.resolvedStatus}/${res.reason}`);
    }

    // Gating check
    try {
      await validateBoutiqueOperationalLimits(ctx.db, boutiqueId);
      throw new Error("FAIL: validateBoutiqueOperationalLimits should have blocked checkout on holiday.");
    } catch (err: any) {
      console.log("✓ Expected block:", err.message);
    }

    // Reset holiday dates
    await ctx.db.patch(boutiqueId, { holidayDates: [] });
    console.log("✓ Test 3 Passed.");

    // TEST 4: Manual Paused state (closedUntil)
    console.log("Test 4: Manual closedUntil pause...");
    const farFuture = now + 24 * 60 * 60 * 1000; // tomorrow
    await ctx.db.patch(boutiqueId, {
      storeStatus: "closed",
      closedUntil: farFuture,
      pauseReason: "vacation",
      storeMessage: "We are on vacation!",
    });
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "closed" || res.isAcceptingOrders || res.reason !== "manual_closed") {
      throw new Error(`FAIL: Expected closed/manual_closed, got ${res.resolvedStatus}/${res.reason}`);
    }

    // Gating check
    try {
      await validateBoutiqueOperationalLimits(ctx.db, boutiqueId);
      throw new Error("FAIL: validateBoutiqueOperationalLimits should have blocked checkout on manual closed pause.");
    } catch (err: any) {
      console.log("✓ Expected block:", err.message);
      if (!err.message.includes("We are on vacation!")) {
        throw new Error(`FAIL: Expected vacation custom message, got '${err.message}'`);
      }
    }

    // Test auto-reopen by setting closedUntil to past
    const pastTime = now - 10000;
    await ctx.db.patch(boutiqueId, { closedUntil: pastTime });
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "open" || !res.isAcceptingOrders) {
      throw new Error(`FAIL: Expected auto-reopen to 'open' since closedUntil has passed, got ${res.resolvedStatus}`);
    }

    // Reset storeStatus
    await ctx.db.patch(boutiqueId, { storeStatus: "open", closedUntil: undefined, pauseReason: undefined, storeMessage: undefined });
    console.log("✓ Test 4 Passed.");

    // TEST 5: O(1) Counter and Capacity Limits
    console.log("Test 5: Order capacity counters and threshold shifts...");
    await ctx.db.patch(boutiqueId, { dailyOrderLimit: 10 });

    // Initial check (0 active orders)
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "open") {
      throw new Error(`FAIL: Expected open at 0/10 capacity, got ${res.resolvedStatus}`);
    }

    // Increment orders to 7 (still open, below 80%)
    for (let i = 0; i < 7; i++) {
      await incrementBoutiqueOrderCount(ctx, boutiqueId, now);
    }
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "open") {
      throw new Error(`FAIL: Expected open at 7/10 capacity, got ${res.resolvedStatus}`);
    }

    // Increment to 8 (80% capacity -> busy)
    await incrementBoutiqueOrderCount(ctx, boutiqueId, now);
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "busy" || res.reason !== "capacity_busy") {
      throw new Error(`FAIL: Expected busy/capacity_busy at 8/10 capacity, got ${res.resolvedStatus}/${res.reason}`);
    }

    // Busy should allow checkout
    await validateBoutiqueOperationalLimits(ctx.db, boutiqueId);
    console.log("✓ Busy mode check allowed checkout successfully.");

    // Increment to 10 (100% capacity -> temporarily_unavailable)
    await incrementBoutiqueOrderCount(ctx, boutiqueId, now);
    await incrementBoutiqueOrderCount(ctx, boutiqueId, now);
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "temporarily_unavailable" || res.reason !== "capacity_limit") {
      throw new Error(`FAIL: Expected temporarily_unavailable/capacity_limit at 10/10 capacity, got ${res.resolvedStatus}/${res.reason}`);
    }

    // Gating check should now block checkout
    try {
      await validateBoutiqueOperationalLimits(ctx.db, boutiqueId);
      throw new Error("FAIL: Should have blocked checkout at 100% daily limit.");
    } catch (err: any) {
      console.log("✓ Expected block at 100% capacity:", err.message);
    }

    // Decrement order count
    const fakeOrder = { createdAt: now };
    await decrementBoutiqueOrderCount(ctx, boutiqueId, fakeOrder);
    b = await getB();
    res = await resolveBoutiqueStatus(ctx.db, b);
    if (res.resolvedStatus !== "busy") {
      throw new Error(`FAIL: Expected busy after decrementing from 10 to 9, got ${res.resolvedStatus}`);
    }
    console.log("✓ Test 5 Passed.");

    // Cleanup
    await ctx.db.delete(boutiqueId);
    console.log("=== ALL VACATION MODE & CAPACITY CONTROL TESTS PASSED ===");
    return { success: true };
  },
});
