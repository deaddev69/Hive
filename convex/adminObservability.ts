// convex/adminObservability.ts
// Backend APIs for Admin Observability Console: metrics, health score trends, alerts, and cron tracking.

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { settleEligibleOrdersHelper, runReconciliationHelper } from "./adminFinance";
import { logSystemAlert } from "./lib/alerts";

/**
 * Shared helper to calculate the executive Marketplace Health Score dynamically.
 */
async function calculateHealthScoreHelper(ctx: any) {
  const now = Date.now();
  const orders = await ctx.db.query("orders").collect();
  const claims = await ctx.db.query("claims").collect();
  const shipments = await ctx.db.query("shipments").collect();
  const boutiques = await ctx.db.query("boutiques").collect();
  
  const pendingDocs = await ctx.db
    .query("boutiqueDocuments")
    .withIndex("by_status", (q: any) => q.eq("status", "pending"))
    .collect();

  const unresolvedAlerts = await ctx.db
    .query("systemAlerts")
    .withIndex("by_resolved", (q: any) => q.eq("resolved", false))
    .collect();

  const activeBoutiquesCount = boutiques.filter((b: any) => b.status === "APPROVED").length;

  // 1. Claims Rate
  const claimsRate = orders.length > 0 ? (claims.length / orders.length) * 100 : 0;

  // 2. RTO Rate
  const rtoShipmentsCount = shipments.filter((s: any) => 
    ["rto_initiated", "rto_in_transit", "rto_delivered", "returned"].includes(s.status)
  ).length;
  const rtoRate = shipments.length > 0 ? (rtoShipmentsCount / shipments.length) * 100 : 0;

  // 3. SLA Breaches
  const breachedShipmentsCount = shipments.filter((s: any) => s.slaStatus === "breached").length;
  const slaBreachRate = shipments.length > 0 ? (breachedShipmentsCount / shipments.length) * 100 : 0;

  // 4. Compliance Backlog
  const uniqueBoutiqueIds = new Set(pendingDocs.map((d: any) => d.boutiqueId));
  const complianceBacklog = uniqueBoutiqueIds.size;

  // 5. Exception Queue
  const failedShipmentsCount = shipments.filter((s: any) => s.status === "failed").length;

  // 6. Open Critical Alerts
  const openCriticalAlertsCount = unresolvedAlerts.filter((a: any) => a.severity === "critical").length;

  // Formula Calculations
  const claimsDeduction = claimsRate * 2;
  const rtoDeduction = rtoRate * 1.5;
  const slaDeduction = slaBreachRate * 2;
  const complianceDeduction = Math.min(15, complianceBacklog * 1);
  const exceptionDeduction = Math.min(10, failedShipmentsCount * 0.5);
  const criticalAlertsDeduction = openCriticalAlertsCount * 3;

  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 - (claimsDeduction + rtoDeduction + slaDeduction + complianceDeduction + exceptionDeduction + criticalAlertsDeduction)
      )
    )
  );

  return {
    healthScore,
    claimsRate,
    rtoRate,
    slaBreachRate,
    complianceBacklog,
    failedShipmentsCount,
    openCriticalAlertsCount,
    merchantsCount: activeBoutiquesCount,
    unresolvedAlerts,
    pendingDocs,
    orders,
    claims,
    shipments,
  };
}

/**
 * Retrieve observability dashboard metrics, alert counts, and cron job status runs.
 */
export const getObservabilityDashboardAdmin = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const health = await calculateHealthScoreHelper(ctx);

    // 1. Settlement Backlog (unpaid available settlements)
    const settlements = await ctx.db.query("settlementLedger").collect();
    const settlementBacklog = settlements.filter(
      (s) => s.status === "available" && s.payoutId === undefined
    ).length;

    // 2. Payout Backlog (number of wallets with available balance > 0)
    const boutiqueBalances: Record<string, number> = {};
    for (const s of settlements) {
      if (s.status === "available" && s.payoutId === undefined) {
        boutiqueBalances[s.boutiqueId] = (boutiqueBalances[s.boutiqueId] || 0) + s.amount;
      }
    }
    const payoutBacklog = Object.values(boutiqueBalances).filter((bal: any) => bal > 0).length;

    // 3. Claim Backlog (non-finalized disputes)
    const claimBacklog = health.claims.filter(
      (c: any) => !["closed", "rejected", "refunded"].includes(c.status)
    ).length;

    // 4. Logistics Exceptions (failed shipments)
    const logisticsExceptions = health.failedShipmentsCount;

    // 4b. Refund Queue Monitoring
    const refundQueue = await ctx.db.query("refundQueue").collect();
    const failedRefundsCount = refundQueue.filter(r => r.status === "failed").length;
    const stuckRefundsCount = refundQueue.filter(r => 
      (r.status === "pending" || r.status === "processing") && r.createdAt < now - 24 * 3600 * 1000
    ).length;

    // 5. Same-Day SLA %
    const deliveredShipments = health.shipments.filter((s: any) => s.status === "delivered");
    let deliveredWithin8hCount = 0;
    for (const s of deliveredShipments) {
      const order = health.orders.find((o: any) => o._id === s.orderId);
      if (order && order.orderAcceptedAt && order.deliveredAt) {
        const duration = order.deliveredAt - order.orderAcceptedAt;
        if (duration <= 8 * 3600 * 1000) {
          deliveredWithin8hCount++;
        }
      }
    }
    const sameDaySlaPercent =
      deliveredShipments.length > 0 ? (deliveredWithin8hCount / deliveredShipments.length) * 100 : 100;

    // 6. Health Score Trend snapshots (Today, Yesterday, 7D Avg)
    const snapshots = await ctx.db
      .query("marketplaceHealthSnapshots")
      .order("desc")
      .collect();

    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const yesterdaySnapshot = snapshots.find(
      (s: any) => s.createdAt < startOfToday && s.createdAt >= startOfToday - 24 * 3600 * 1000
    ) || snapshots.find((s: any) => s.createdAt < startOfToday);
    
    const yesterdayScore = yesterdaySnapshot ? yesterdaySnapshot.score : health.healthScore;

    const last7DaysSnapshots = snapshots.filter(
      (s: any) => s.createdAt >= now - 7 * 24 * 3600 * 1000
    );
    const sumScores = last7DaysSnapshots.reduce((sum: number, s: any) => sum + s.score, 0) + health.healthScore;
    const avg7DayScore = Math.round(sumScores / (last7DaysSnapshots.length + 1));

    // 7. Needs Immediate Attention List
    const needsImmediateAttention = [];

    // Settlement backlog threshold (> 50)
    if (settlementBacklog > 50) {
      needsImmediateAttention.push({
        label: `${settlementBacklog} Settlements Pending Release`,
        severity: "critical",
      });
    }

    // Claims pending threshold (> 10)
    const claimsAwaitingReview = health.claims.filter((c: any) => ["submitted", "under_review"].includes(c.status)).length;
    if (claimsAwaitingReview > 0) {
      needsImmediateAttention.push({
        label: `${claimsAwaitingReview} Claims Awaiting Review`,
        severity: claimsAwaitingReview > 10 ? "critical" : "warning",
      });
    }

    // Compliance backlog threshold (> 20)
    const docsAwaitingReview = health.pendingDocs.length;
    if (docsAwaitingReview > 0) {
      needsImmediateAttention.push({
        label: `${docsAwaitingReview} Compliance Documents Awaiting Review`,
        severity: docsAwaitingReview > 20 ? "critical" : "warning",
      });
    }

    // RTO Rate threshold (> 5%)
    if (health.rtoRate > 5) {
      needsImmediateAttention.push({
        label: `High RTO Rate (${health.rtoRate.toFixed(1)}%)`,
        severity: "critical",
      });
    }

    // SLA Breach Rate threshold (> 10%)
    if (health.slaBreachRate > 10) {
      needsImmediateAttention.push({
        label: `High SLA Breach Rate (${health.slaBreachRate.toFixed(1)}%)`,
        severity: "critical",
      });
    }

    // Delayed Shipments (always show if > 0)
    const breachedShipmentsCount = health.shipments.filter((s: any) => s.slaStatus === "breached").length;
    if (breachedShipmentsCount > 0) {
      needsImmediateAttention.push({
        label: `${breachedShipmentsCount} Delayed Shipments (SLA Breached)`,
        severity: "critical",
      });
    }

    // Failed Refunds (always show if > 0)
    if (failedRefundsCount > 0) {
      needsImmediateAttention.push({
        label: `${failedRefundsCount} Failed Refunds`,
        severity: "critical",
      });
    }

    // Stuck Refunds Pending >24h (always show if > 0)
    if (stuckRefundsCount > 0) {
      needsImmediateAttention.push({
        label: `${stuckRefundsCount} Refunds Pending >24h`,
        severity: "warning",
      });
    }

    // Blocked payouts
    const payoutsBlockedCount = health.unresolvedAlerts.filter((a: any) => a.code === "payout.blocked").length;
    if (payoutsBlockedCount > 0) {
      needsImmediateAttention.push({
        label: `${payoutsBlockedCount} Payouts Blocked`,
        severity: "warning",
      });
    }

    // 8. Alerts breakdown
    const alertsBreakdown = {
      "claim.transition_failed": health.unresolvedAlerts.filter((a: any) => a.code === "claim.transition_failed").length,
      "shipment.transition_failed": health.unresolvedAlerts.filter((a: any) => a.code === "shipment.transition_failed").length,
      "payout.blocked": health.unresolvedAlerts.filter((a: any) => a.code === "payout.blocked").length,
      "settlement.frozen": health.unresolvedAlerts.filter((a: any) => a.code === "settlement.frozen").length,
      "inventory.restore_blocked": health.unresolvedAlerts.filter((a: any) => a.code === "inventory.restore_blocked").length,
      "cron.failed": health.unresolvedAlerts.filter((a: any) => a.code === "cron.failed").length,
    };

    // 9. Cron Runs
    const getLatestCronRun = async (cronName: "settlement_cron" | "performance_recalc" | "reconciliation_scan") => {
      return await ctx.db
        .query("cronRuns")
        .withIndex("by_cronName_createdAt", (q: any) => q.eq("cronName", cronName))
        .order("desc")
        .first();
    };

    const settlementCronRun = await getLatestCronRun("settlement_cron");
    const performanceRecalcRun = await getLatestCronRun("performance_recalc");
    const reconciliationScanRun = await getLatestCronRun("reconciliation_scan");

    return {
      healthScore: health.healthScore,
      yesterdayScore,
      avg7DayScore,
      needsImmediateAttention,
      backlogs: {
        settlementBacklog,
        payoutBacklog,
        claimBacklog,
        complianceBacklog: health.complianceBacklog,
        logisticsExceptions,
        failedRefundsCount,
        stuckRefundsCount,
        rtoRate: Math.round(health.rtoRate * 10) / 10,
        sameDaySlaPercent: Math.round(sameDaySlaPercent * 10) / 10,
      },
      alertsBreakdown,
      unresolvedAlerts: health.unresolvedAlerts,
      crons: {
        settlementCronRun,
        performanceRecalcRun,
        reconciliationScanRun,
      },
    };
  },
});

/**
 * Resolve an active system alert incident.
 */
export const resolveSystemAlertAdmin = mutation({
  args: { alertId: v.id("systemAlerts") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const alert = await ctx.db.get(args.alertId);
    if (!alert) throw new Error("Alert not found");

    await ctx.db.patch(args.alertId, {
      resolved: true,
      resolvedAt: now,
      resolvedBy: admin._id,
    });

    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "system_alert.resolved",
      entityType: "systemAlerts",
      entityId: args.alertId,
      metadata: JSON.stringify({ code: alert.code, message: alert.message }),
      createdAt: now,
    });

    return args.alertId;
  },
});

/**
 * Manually trigger and profile a background cron job runner.
 */
export const triggerCronJobAdmin = mutation({
  args: {
    cronName: v.union(
      v.literal("settlement_cron"),
      v.literal("performance_recalc"),
      v.literal("reconciliation_scan")
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const startedAt = Date.now();

    // Cron Lock Protection: Check if this cron is already running within last 10 minutes
    const tenMinutesAgo = startedAt - 10 * 60 * 1000;
    const latestRun = await ctx.db
      .query("cronRuns")
      .withIndex("by_cronName_createdAt", (q: any) => q.eq("cronName", args.cronName))
      .order("desc")
      .first();

    if (latestRun && latestRun.status === "running" && latestRun.startedAt > tenMinutesAgo) {
      console.log(`Cron ${args.cronName} is already running. Skipping execution.`);
      return { success: false, reason: "running" };
    }

    if (args.cronName === "settlement_cron") {
      // settleEligibleOrdersHelper handles its own locking, run logging, and alerts.
      return await settleEligibleOrdersHelper(ctx, admin._id);
    }

    // Insert running lock record
    const runId = await ctx.db.insert("cronRuns", {
      cronName: args.cronName,
      startedAt,
      finishedAt: startedAt,
      durationMs: 0,
      status: "running",
      metrics: {},
      createdAt: startedAt,
    });

    try {
      if (args.cronName === "reconciliation_scan") {
        const res = await runReconciliationHelper(ctx.db);
        if (res.missingSettlementExceptions && res.missingSettlementExceptions.length > 0) {
          await logSystemAlert(
            ctx,
            "finance.settlement_missing",
            `Critical: ${res.missingSettlementExceptions.length} delivered order(s) are missing settlement accrual records.`,
            "critical",
            { exceptions: res.missingSettlementExceptions }
          );
        }
        const finishedAt = Date.now();
        await ctx.db.patch(runId, {
          finishedAt,
          durationMs: finishedAt - startedAt,
          status: "success",
          metrics: { exceptionsFound: res.exceptionsCount },
        });
        return { success: true, res };
      } else if (args.cronName === "performance_recalc") {
        const scoreResult = await calculateHealthScoreHelper(ctx);
        const finishedAt = Date.now();

        await ctx.db.insert("marketplaceHealthSnapshots", {
          score: scoreResult.healthScore,
          claimsRate: scoreResult.claimsRate,
          rtoRate: scoreResult.rtoRate,
          slaRate: scoreResult.slaBreachRate,
          createdAt: finishedAt,
        });

        await ctx.db.patch(runId, {
          finishedAt,
          durationMs: finishedAt - startedAt,
          status: "success",
          metrics: { merchantsUpdated: scoreResult.merchantsCount },
        });
        return { success: true, healthScore: scoreResult.healthScore };
      }
    } catch (err: any) {
      const finishedAt = Date.now();
      await ctx.db.patch(runId, {
        finishedAt,
        durationMs: finishedAt - startedAt,
        status: "failed",
        metrics: {},
        error: err.message,
      });

      // Log system alert for cron failure
      await logSystemAlert(
        ctx,
        "cron.failed",
        `Cron Job Failed: ${args.cronName} execution error: ${err.message}`,
        "critical",
        { cronName: args.cronName, error: err.message }
      );
      throw err;
    }
  },
});

/**
 * Internal background mutation to trigger cron jobs automatically.
 * Bypasses user role verification, logs run as "system".
 */
export const triggerCronJobInternal = internalMutation({
  args: {
    cronName: v.union(
      v.literal("settlement_cron"),
      v.literal("performance_recalc")
    ),
  },
  handler: async (ctx, args) => {
    const startedAt = Date.now();

    // Cron Lock Protection: Check if this cron is already running within last 10 minutes
    const tenMinutesAgo = startedAt - 10 * 60 * 1000;
    const latestRun = await ctx.db
      .query("cronRuns")
      .withIndex("by_cronName_createdAt", (q: any) => q.eq("cronName", args.cronName))
      .order("desc")
      .first();

    if (latestRun && latestRun.status === "running" && latestRun.startedAt > tenMinutesAgo) {
      console.log(`Cron ${args.cronName} (internal) is already running. Skipping execution.`);
      return { success: false, reason: "running" };
    }

    if (args.cronName === "settlement_cron") {
      // settleEligibleOrdersHelper handles its own locking, run logging, and alerts.
      return await settleEligibleOrdersHelper(ctx);
    }

    // Insert running lock record
    const runId = await ctx.db.insert("cronRuns", {
      cronName: args.cronName,
      startedAt,
      finishedAt: startedAt,
      durationMs: 0,
      status: "running",
      metrics: {},
      createdAt: startedAt,
    });

    try {
      if (args.cronName === "performance_recalc") {
        const scoreResult = await calculateHealthScoreHelper(ctx);
        const finishedAt = Date.now();

        await ctx.db.insert("marketplaceHealthSnapshots", {
          score: scoreResult.healthScore,
          claimsRate: scoreResult.claimsRate,
          rtoRate: scoreResult.rtoRate,
          slaRate: scoreResult.slaBreachRate,
          createdAt: finishedAt,
        });

        await ctx.db.patch(runId, {
          finishedAt,
          durationMs: finishedAt - startedAt,
          status: "success",
          metrics: { merchantsUpdated: scoreResult.merchantsCount },
        });
        return { success: true, healthScore: scoreResult.healthScore };
      }
    } catch (err: any) {
      const finishedAt = Date.now();
      await ctx.db.patch(runId, {
        finishedAt,
        durationMs: finishedAt - startedAt,
        status: "failed",
        metrics: {},
        error: err.message,
      });

      // Log system alert for cron failure
      await logSystemAlert(
        ctx,
        "cron.failed",
        `Cron Job Failed: ${args.cronName} execution error: ${err.message}`,
        "critical",
        { cronName: args.cronName, error: err.message }
      );
      throw err;
    }
  },
});

/**
 * Seed historical trend data (snapshots) and mock system alerts to populate dashboards.
 */
export const seedObservabilityDataAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Seeding mock observability data is disabled in this environment.");
    }
    const identity = await ctx.auth.getUserIdentity();
    let admin;
    if (!identity) {
      admin = await ctx.db
        .query("users")
        .filter((q: any) => q.eq(q.field("role"), "admin"))
        .first();
      if (!admin) throw new Error("No admin user found to seed observability data.");
    } else {
      admin = await requireRole(ctx, "admin");
    }
    const now = Date.now();

    // 1. Seed last 7 days of daily marketplace health snapshots
    const oneDay = 24 * 3600 * 1000;
    const scores = [88, 89, 90, 87, 91, 89, 92];
    for (let i = 0; i < scores.length; i++) {
      const ts = now - (scores.length - i) * oneDay;
      await ctx.db.insert("marketplaceHealthSnapshots", {
        score: scores[i] as number,
        claimsRate: 2.1,
        rtoRate: 4.5,
        slaRate: 5.2,
        createdAt: ts,
      });
    }

    // 2. Seed some unresolved and resolved system alerts for visibility testing
    await ctx.db.insert("systemAlerts", {
      code: "payout.blocked",
      severity: "warning",
      message: "Payout Blocked: Bank Proof document is not verified for boutique 'Elite Threads'.",
      resolved: false,
      createdAt: now - 3 * 3600 * 1000,
    });

    await ctx.db.insert("systemAlerts", {
      code: "shipment.transition_failed",
      severity: "critical",
      message: "State machine violation: Cannot transition shipment status from 'delivered' to 'picked_up' on AWB 98321045",
      resolved: false,
      createdAt: now - 1 * 3600 * 1000,
    });

    await ctx.db.insert("systemAlerts", {
      code: "settlement.frozen",
      severity: "warning",
      message: "Settlement frozen: Order HV-20260601-0042 has open claims/disputes.",
      resolved: true,
      resolvedAt: now - 2 * 3600 * 1000,
      resolvedBy: admin._id,
      createdAt: now - 5 * 3600 * 1000,
    });

    // 3. Seed some mock initial cron runs
    await ctx.db.insert("cronRuns", {
      cronName: "settlement_cron",
      startedAt: now - 12 * 3600 * 1000,
      finishedAt: now - 12 * 3600 * 1000 + 45,
      durationMs: 45,
      status: "success",
      metrics: { ordersReleased: 8, failures: 1 },
      createdAt: now - 12 * 3600 * 1000,
    });

    await ctx.db.insert("cronRuns", {
      cronName: "performance_recalc",
      startedAt: now - 6 * 3600 * 1000,
      finishedAt: now - 6 * 3600 * 1000 + 820,
      durationMs: 820,
      status: "success",
      metrics: { merchantsUpdated: 14 },
      createdAt: now - 6 * 3600 * 1000,
    });

    await ctx.db.insert("cronRuns", {
      cronName: "reconciliation_scan",
      startedAt: now - 24 * 3600 * 1000,
      finishedAt: now - 24 * 3600 * 1000 + 2400,
      durationMs: 2400,
      status: "success",
      metrics: { exceptionsFound: 0 },
      createdAt: now - 24 * 3600 * 1000,
    });

    return { success: true };
  },
});
