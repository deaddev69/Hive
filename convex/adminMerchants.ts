// convex/adminMerchants.ts
// Admin merchant performance intelligence and coaching engine.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Get dynamic, volume-gated performance stats, trends, trust tiers,
 * and prioritized coaching recommendations for all active boutiques.
 */
export const getMerchantPerformanceDashboardAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 3600 * 1000;
    const sixtyDaysAgo = now - 60 * 24 * 3600 * 1000;

    const boutiques = await ctx.db.query("boutiques").collect();
    const boutiquePerformance = [];

    let platformTotalReady = 0;
    let platformTotalCompliantPickup = 0;
    let platformTotalFulfillmentScoreSum = 0;

    for (const b of boutiques) {
      // Fetch all orders and claims for this boutique once
      const allOrders = await ctx.db
        .query("orders")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
        .collect();

      const allClaims = await ctx.db
        .query("claims")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
        .collect();

      // Fetch compliance certificates
      const docs = await ctx.db
        .query("boutiqueDocuments")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
        .collect();

      const coreDocTypes = ["gst_certificate", "pan", "trade_license", "bank_proof"];
      const complianceVerified = coreDocTypes.every(type =>
        docs.some(d => d.type === type && d.status === "verified")
      );

      // Calculates metrics for a specific time range
      const calculatePeriodMetrics = async (
        ordersList: typeof allOrders,
        claimsList: typeof allClaims,
        start: number,
        end: number
      ) => {
        const periodOrders = ordersList.filter(o => o.createdAt >= start && o.createdAt <= end);
        const validOrders = periodOrders.filter(o => o.status !== "pending_payment");
        const totalOrders = validOrders.length;

        if (totalOrders === 0) {
          return {
            totalOrders: 0,
            deliveredOrders: 0,
            cancellationRate: 0,
            rtoRate: 0,
            claimRate: 0,
            sameDayPercent: 100,
            fulfillmentScore: 100,
            gmv: 0,
            refundsSum: 0,
            avgPrepTimeMinutes: 0,
            pickupCompliancePercent: 100,
            readyCount: 0,
            compliantPickupCount: 0,
          };
        }

        const deliveredOrdersList = validOrders.filter(o => o.status === "delivered");
        const deliveredOrders = deliveredOrdersList.length;

        const cancelledOrders = validOrders.filter(o => o.status === "cancelled");
        const cancellationRate = (cancelledOrders.length / totalOrders) * 100;

        let rtoCount = 0;
        for (const o of validOrders) {
          if (o.shipmentId) {
            const shipment = await ctx.db.get(o.shipmentId);
            if (shipment && ["rto_initiated", "rto_in_transit", "rto_delivered", "returned"].includes(shipment.status)) {
              rtoCount++;
            }
          }
        }
        const rtoRate = (rtoCount / totalOrders) * 100;

        const periodClaims = claimsList.filter(c => c.submittedAt >= start && c.submittedAt <= end);
        const claimRate = (periodClaims.length / totalOrders) * 100;

        let sameDayCount = 0;
        for (const o of deliveredOrdersList) {
          const startTime = o.orderAcceptedAt || o.confirmedAt || o.createdAt;
          const endTime = o.deliveredAt;
          if (startTime && endTime && (endTime - startTime <= 8 * 3600 * 1000)) {
            sameDayCount++;
          }
        }
        const sameDayPercent = deliveredOrders > 0 ? (sameDayCount / deliveredOrders) * 100 : 100;

        // GMV: sum of order totals
        const gmv = validOrders
          .filter(o => o.paymentStatus === "paid" || o.paymentStatus === "refunded")
          .reduce((sum, o) => sum + o.total, 0);

        // Claims refunds total
        const refundsSum = periodClaims.reduce((sum, c) => sum + (c.refundAmount ?? 0), 0);

        // Avg Prep Time (accepted -> ready)
        let totalPrepTimeMs = 0;
        let prepCount = 0;
        for (const o of validOrders) {
          if (o.orderAcceptedAt && o.readyForPickupAt) {
            totalPrepTimeMs += (o.readyForPickupAt - o.orderAcceptedAt);
            prepCount++;
          }
        }
        const avgPrepTimeMinutes = prepCount > 0 ? (totalPrepTimeMs / prepCount) / (60 * 1000) : 0;

        // Pickup Compliance (pickedUpAt - readyForPickupAt <= 60 mins)
        let readyCount = 0;
        let compliantPickupCount = 0;
        for (const o of validOrders) {
          if (o.readyForPickupAt) {
            readyCount++;
            if (o.pickedUpAt && (o.pickedUpAt - o.readyForPickupAt <= 60 * 60 * 1000)) {
              compliantPickupCount++;
            }
          }
        }
        const pickupCompliancePercent = readyCount > 0 ? (compliantPickupCount / readyCount) * 100 : 100;

        // Score weights
        const cancelDeduction = Math.min(30, cancellationRate * 2.0);
        const rtoDeduction = Math.min(25, rtoRate * 1.5);
        const claimDeduction = Math.min(30, claimRate * 3.0);
        const sameDayDeduction = Math.min(15, (100 - sameDayPercent) * 1.0);

        const rawScore = 100 - (cancelDeduction + rtoDeduction + claimDeduction + sameDayDeduction);
        const fulfillmentScore = Math.max(0, Math.min(100, rawScore));

        return {
          totalOrders,
          deliveredOrders,
          cancellationRate,
          rtoRate,
          claimRate,
          sameDayPercent,
          fulfillmentScore,
          gmv,
          refundsSum,
          avgPrepTimeMinutes,
          pickupCompliancePercent,
          readyCount,
          compliantPickupCount,
        };
      };

      const metricsA = await calculatePeriodMetrics(allOrders, allClaims, thirtyDaysAgo, now);
      const metricsB = await calculatePeriodMetrics(allOrders, allClaims, sixtyDaysAgo, thirtyDaysAgo);

      // Accumulate platform aggregates
      platformTotalReady += metricsA.readyCount;
      platformTotalCompliantPickup += metricsA.compliantPickupCount;
      platformTotalFulfillmentScoreSum += metricsA.fulfillmentScore;

      // Trend trajectory
      let trend: "improving" | "stable" | "declining" = "stable";
      if (metricsB.totalOrders > 0) {
        const diff = metricsA.fulfillmentScore - metricsB.fulfillmentScore;
        if (diff > 2.0) trend = "improving";
        else if (diff < -2.0) trend = "declining";
      }

      // Suggested Tier Classifier (volume and metric gated)
      let suggestedTier: "Bronze" | "Silver" | "Gold" | "Elite" = "Bronze";
      if (
        metricsA.fulfillmentScore >= 95 &&
        metricsA.deliveredOrders >= 100 &&
        metricsA.sameDayPercent >= 95 &&
        metricsA.claimRate < 2 &&
        complianceVerified
      ) {
        suggestedTier = "Elite";
      } else if (
        metricsA.fulfillmentScore >= 90 &&
        metricsA.deliveredOrders >= 40 &&
        complianceVerified
      ) {
        suggestedTier = "Gold";
      } else if (metricsA.fulfillmentScore >= 80) {
        suggestedTier = "Silver";
      }

      // Persistent merchant tier (defaults to Bronze)
      const merchantTier = b.merchantTier || "Bronze";
      const trustTier = merchantTier;

      // Prioritized Coaching Alert logic
      let primaryIssue = "None";
      let impactDescription = "Boutique is performing at optimal logistics levels.";
      let recommendedAction = "Maintain excellent fulfillment SLAs to qualify for Elite rewards.";
      const secondaryIssues = [];

      const triggers = {
        claims: metricsA.claimRate > 5,
        cancellations: metricsA.cancellationRate > 10,
        rto: metricsA.rtoRate > 8,
        sameDay: metricsA.sameDayPercent < 80,
        prep: metricsA.avgPrepTimeMinutes > 60,
      };

      const claimPercentOfGmv = metricsA.gmv > 0 ? Math.round((metricsA.refundsSum / metricsA.gmv) * 100 * 10) / 10 : 0.0;

      // Priority ordering logic
      if (triggers.claims) {
        primaryIssue = "High Claim Rate";
        impactDescription = `Claims are costing ${claimPercentOfGmv}% of GMV.`;
        recommendedAction = "Improve size accuracy and QC checks.";
        if (triggers.cancellations) secondaryIssues.push("High Cancellation Rate");
        if (triggers.rto) secondaryIssues.push("High RTO Rate");
        if (triggers.sameDay) secondaryIssues.push("Low Same Day Rate");
        if (triggers.prep) secondaryIssues.push("High Prep Delay");
      } else if (triggers.cancellations) {
        primaryIssue = "High Cancellation Rate";
        impactDescription = "Cancellations reduce buyer retention and platform trust.";
        recommendedAction = "Keep inventory levels accurate in the seller panel.";
        if (triggers.rto) secondaryIssues.push("High RTO Rate");
        if (triggers.sameDay) secondaryIssues.push("Low Same Day Rate");
        if (triggers.prep) secondaryIssues.push("High Prep Delay");
      } else if (triggers.rto) {
        primaryIssue = "High RTO Rate";
        impactDescription = "Returned packages incur double shipping fees.";
        recommendedAction = "Call customers to confirm addresses for high-value orders.";
        if (triggers.sameDay) secondaryIssues.push("Low Same Day Rate");
        if (triggers.prep) secondaryIssues.push("High Prep Delay");
      } else if (triggers.sameDay) {
        primaryIssue = "Low Same Day Rate";
        impactDescription = "HYPERLOCAL same-day delivery SLAs are breaching.";
        recommendedAction = "Request pickup dispatch within 45 minutes of accepting.";
        if (triggers.prep) secondaryIssues.push("High Prep Delay");
      } else if (triggers.prep) {
        primaryIssue = "High Prep Delay";
        impactDescription = "Merchant prep bottleneck is causing courier delays.";
        recommendedAction = "Prepare orders before accepting peak-hour requests.";
      }

      const isAtRisk = triggers.claims || triggers.cancellations || triggers.rto || triggers.sameDay;

      boutiquePerformance.push({
        boutiqueId: b._id,
        boutiqueName: b.boutiqueName,
        ownerName: b.ownerName,
        status: b.status,
        metrics: {
          orders: metricsA.totalOrders,
          gmv: Math.round((metricsA.gmv / 100) * 100) / 100, // in Rs
          deliveredOrders: metricsA.deliveredOrders,
          cancellationRate: Math.round(metricsA.cancellationRate * 10) / 10,
          rtoRate: Math.round(metricsA.rtoRate * 10) / 10,
          claimRate: Math.round(metricsA.claimRate * 10) / 10,
          sameDayPercent: Math.round(metricsA.sameDayPercent * 10) / 10,
          fulfillmentScore: Math.round(metricsA.fulfillmentScore * 10) / 10,
          avgPrepTimeMinutes: Math.round(metricsA.avgPrepTimeMinutes),
          pickupCompliancePercent: Math.round(metricsA.pickupCompliancePercent * 10) / 10,
        },
        trend,
        merchantTier,
        suggestedTier,
        trustTier,
        isAtRisk,
        coaching: {
          primaryIssue,
          impactDescription,
          recommendedAction,
          secondaryIssues,
        },
      });
    }

    const platformPickupCompliance = platformTotalReady > 0 ? (platformTotalCompliantPickup / platformTotalReady) * 100 : 100;
    const platformAverageFulfillmentScore = boutiques.length > 0 ? platformTotalFulfillmentScoreSum / boutiques.length : 100;

    return {
      boutiques: boutiquePerformance,
      platformMetrics: {
        platformPickupCompliance: Math.round(platformPickupCompliance * 10) / 10,
        platformAverageFulfillmentScore: Math.round(platformAverageFulfillmentScore * 10) / 10,
        totalActiveMerchants: boutiques.filter(b => b.status === "APPROVED").length,
        tierCounts: {
          Elite: boutiquePerformance.filter(b => b.merchantTier === "Elite").length,
          Gold: boutiquePerformance.filter(b => b.merchantTier === "Gold").length,
          Silver: boutiquePerformance.filter(b => b.merchantTier === "Silver").length,
          Bronze: boutiquePerformance.filter(b => b.merchantTier === "Bronze").length,
        },
      },
    };
  },
});
