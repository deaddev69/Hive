import { query } from "./_generated/server";
import { v } from "convex/values";
import { RegisteredQuery } from "convex/server";
import { requireRole } from "./lib/auth";
import { determineOnboardingStatus } from "./boutiques";
import { getPublicUrl } from "./media/api";

export const getAdminCombinedDashboardData = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const [
      boutiquesData,
      categories,
      banners,
      metrics,
      applications,
      activityFeed,
      onboardingMetrics,
    ] = await Promise.all([
      // 1. Boutiques list (limit 100)
      (async () => {
        const list = await ctx.db.query("boutiques").order("desc").take(100);
        const boutiquesFiltered = list.filter(b => 
          !b.boutiqueName.startsWith("Chaos Test Boutique") && 
          !b.boutiqueName.startsWith("Mock Boutique") && 
          b.isTestData !== true
        );
        return await Promise.all(
          boutiquesFiltered.map(async (b) => {
            const onboardingStatus = await determineOnboardingStatus(ctx, b);
            return {
              ...b,
              onboardingStatus,
            };
          })
        );
      })(),

      // 2. Categories list
      (async () => {
        const categoriesList = await ctx.db.query("categories").collect();
        return Promise.all(
          categoriesList.map(async (cat) => {
            let imageUrl = cat.imageUrl || null;
            if (cat.imageStorageId) {
              if (typeof cat.imageStorageId === "object") {
                imageUrl = getPublicUrl(cat.imageStorageId as any);
              } else if (typeof cat.imageStorageId === "string" && cat.imageStorageId.startsWith("http")) {
                imageUrl = cat.imageStorageId;
              } else {
                try {
                  imageUrl = await ctx.storage.getUrl(cat.imageStorageId as any);
                } catch {}
              }
            }
            let homepageImageUrl = cat.homepageImage || null;
            if (cat.homepageImage && !cat.homepageImage.startsWith("http")) {
              try {
                homepageImageUrl = await ctx.storage.getUrl(cat.homepageImage as any);
              } catch {}
            }
            return {
              ...cat,
              imageUrl,
              homepageImageUrl,
            };
          })
        );
      })(),

      // 3. Active banners
      ctx.db.query("banners").collect(),

      // 4. Admin dashboard metrics (Task 1 bounded version inlined)
      (async () => {
        const [
          pendingConfirmationList,
          pendingPaymentList,
          confirmedList,
          deliveredList,
          packedList,
          pickupScheduledList,
          pickedUpList,
          inTransitList,
          outForDeliveryList,
          cancelledList,
          refundedList,
          bookingFailedList,
          claimSubmittedList,
          replacementRequestedList,
          replacementApprovedList,
          replacementDispatchedList,
          replacementDeliveredList,
          refundRequestedList,
        ] = await Promise.all([
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pending_confirmation")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pending_payment")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "confirmed")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "delivered")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "packed")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "pickup_scheduled")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "picked_up")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "in_transit")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "out_for_delivery")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "cancelled")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "refunded")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "booking_failed")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "claim_submitted")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_requested")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_approved")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_dispatched")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "replacement_delivered")).take(1000),
          ctx.db.query("orders").withIndex("by_status", q => q.eq("status", "refund_requested")).take(1000),
        ]);

        const allOrders = [
          ...pendingConfirmationList,
          ...pendingPaymentList,
          ...confirmedList,
          ...deliveredList,
          ...packedList,
          ...pickupScheduledList,
          ...pickedUpList,
          ...inTransitList,
          ...outForDeliveryList,
          ...cancelledList,
          ...refundedList,
          ...bookingFailedList,
          ...claimSubmittedList,
          ...replacementRequestedList,
          ...replacementApprovedList,
          ...replacementDispatchedList,
          ...replacementDeliveredList,
          ...refundRequestedList,
        ];

        const pendingOrders = pendingConfirmationList.length + pendingPaymentList.length + confirmedList.length;
        const deliveredOrders = deliveredList.length;
        const totalOrders = allOrders.length;

        const totalRevenue = deliveredList.reduce((sum, o) => sum + (o.total || 0), 0);

        const now = new Date();
        const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        // TODO: Add a compound index by_status_createdAt or by_paymentStatus_createdAt to optimize fetching today's paid/delivered orders.
        const todayOrders = await ctx.db
          .query("orders")
          .withIndex("by_createdAt", (q) => q.gte("createdAt", startOfToday))
          .take(500);
        const gmvToday = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const ordersToday = todayOrders.length;

        const confirmedOrDelivered = allOrders.filter(o => o.orderAcceptedAt !== undefined);
        const acceptedOnTime = confirmedOrDelivered.filter(o => {
          const delay = o.orderAcceptedAt! - o.createdAt;
          return delay <= 15 * 60 * 1000;
        }).length;
        const acceptanceSlaRate = confirmedOrDelivered.length > 0
          ? (acceptedOnTime / confirmedOrDelivered.length) * 100
          : 100;

        const deliveredOrdersList = allOrders.filter(o => o.status === "delivered");
        let sameDayCount = 0;
        for (const o of deliveredOrdersList) {
          const startTime = o.orderAcceptedAt || o.confirmedAt || o.createdAt;
          const endTime = o.deliveredAt;
          if (endTime && startTime && (endTime - startTime <= 8 * 3600 * 1000)) {
            sameDayCount++;
          }
        }
        const sameDayRate = deliveredOrdersList.length > 0
          ? (sameDayCount / deliveredOrdersList.length) * 100
          : 100;

        const refundedOrdersCount = allOrders.filter(o => o.status === "refunded" || o.paymentStatus === "refunded").length;
        const refundRate = allOrders.length > 0 ? (refundedOrdersCount / allOrders.length) * 100 : 0;

        const claims = await ctx.db.query("claims").collect();
        const claimRate = allOrders.length > 0 ? (claims.length / allOrders.length) * 100 : 0;

        const acceptanceTimes = confirmedOrDelivered.map(o => (o.orderAcceptedAt! - o.createdAt) / (60 * 1000));
        acceptanceTimes.sort((a, b) => a - b);

        const getPercentileValue = (arr: number[], p: number): number => {
          if (arr.length === 0) return 0;
          const index = Math.ceil((p / 100) * arr.length) - 1;
          return Math.round(arr[Math.max(0, index)] ?? 0);
        };

        const ttfaP50 = getPercentileValue(acceptanceTimes, 50);
        const ttfaP90 = getPercentileValue(acceptanceTimes, 90);
        const ttfaP95 = getPercentileValue(acceptanceTimes, 95);

        const ttfaBreach10mCount = acceptanceTimes.filter(t => t > 10).length;
        const ttfaBreach15mCount = acceptanceTimes.filter(t => t > 15).length;

        const commandCenterMetrics = {
          gmvToday,
          ordersToday,
          acceptanceSlaRate: Math.round(acceptanceSlaRate),
          sameDayRate: Math.round(sameDayRate),
          refundRate: Math.round(refundRate * 10) / 10,
          claimRate: Math.round(claimRate * 10) / 10,
          ttfaP50,
          ttfaP90,
          ttfaP95,
          ttfaBreach10mCount,
          ttfaBreach15mCount,
        };

        const recentOrdersRaw = await ctx.db
          .query("orders")
          .order("desc")
          .take(10);

        const customerIds = Array.from(new Set(recentOrdersRaw.map((o) => o.customerId)));
        const boutiqueIds = Array.from(new Set(recentOrdersRaw.map((o) => o.boutiqueId)));

        const [customersList, boutiquesList, profilesList] = await Promise.all([
          Promise.all(customerIds.map((id) => ctx.db.get(id))),
          Promise.all(boutiqueIds.map((id) => ctx.db.get(id))),
          Promise.all(customerIds.map((id) => ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", id)).unique()))
        ]);

        const customerMap = new Map(customersList.filter(Boolean).map((c) => [c!._id, c]));
        const boutiqueMap = new Map(boutiquesList.filter(Boolean).map((b) => [b!._id, b]));
        const profileMap = new Map(profilesList.filter(Boolean).map((p) => [p!.userId, p]));

        const recentOrders = recentOrdersRaw.map((order) => {
          const customer = customerMap.get(order.customerId);
          const boutique = boutiqueMap.get(order.boutiqueId);
          const profile = profileMap.get(order.customerId);
          const customerName = profile?.displayName || customer?.email || "Customer";
          return {
            _id: order._id,
            orderNumber: order.orderNumber,
            customerName,
            boutiqueName: boutique?.boutiqueName || "Unknown Boutique",
            total: order.total,
            status: order.status,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          };
        });

        const nowMs = Date.now();
        const twelveHoursAgo = nowMs - 12 * 60 * 60 * 1000;
        const twentyFourHoursAgo = nowMs - 24 * 60 * 60 * 1000;
        const fifteenMinutesAgo = nowMs - 15 * 60 * 1000;

        const ordersPendingOver12h = [...pendingConfirmationList, ...confirmedList].filter(
          (o) => o.createdAt < twelveHoursAgo
        ).length;

        const ordersWaitingAcceptanceOver15m = pendingConfirmationList.filter(
          (o) => o.createdAt < fifteenMinutesAgo
        ).length;

        const totalDelayMs = pendingConfirmationList.reduce((sum, o) => sum + (nowMs - o.createdAt), 0);
        const averageAcceptanceDelayMins = pendingConfirmationList.length > 0
          ? Math.round(totalDelayMs / (pendingConfirmationList.length * 60 * 1000))
          : 0;

        const [submittedClaimsList, underReviewClaimsList] = await Promise.all([
          ctx.db.query("claims").withIndex("by_status", (q) => q.eq("status", "submitted")).collect(),
          ctx.db.query("claims").withIndex("by_status", (q) => q.eq("status", "under_review")).collect(),
        ]);
        const claimsWaitingOver24h = [...submittedClaimsList, ...underReviewClaimsList].filter(
          (c) => c.submittedAt < twentyFourHoursAgo
        ).length;

        const suspendedBoutiquesList = await ctx.db
          .query("boutiques")
          .withIndex("by_status", (q) => q.eq("status", "SUSPENDED"))
          .collect();
        const suspendedBoutiquesCount = suspendedBoutiquesList.length;

        const moderatedProductsList = await ctx.db
          .query("products")
          .withIndex("by_adminHidden", (q) => q.eq("adminHidden", true))
          .collect();
        const productsModeratedCount = moderatedProductsList.length;

        const allProducts = await ctx.db.query("products").collect();
        const totalProducts = allProducts.length;
        const outOfStockProductsCount = allProducts.filter(p => {
          const stock = p.stockBySize || {};
          return Object.values(stock).reduce((sum: number, val: any) => sum + (val || 0), 0) === 0;
        }).length;

        const pendingDocumentsList = await ctx.db
          .query("boutiqueDocuments")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .collect();
        const pendingDocumentsCount = pendingDocumentsList.length;

        const pendingProductsList = await ctx.db
          .query("products")
          .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "pending"))
          .collect();
        const pendingProductsReviewCount = pendingProductsList.length;

        const thirtyMinutesAgo = nowMs - 30 * 60 * 1000;
        const waitingOver15m = pendingConfirmationList.filter(
          (o) => o.createdAt < fifteenMinutesAgo && o.createdAt >= thirtyMinutesAgo
        ).length;
        const waitingOver30m = pendingConfirmationList.filter(
          (o) => o.createdAt < thirtyMinutesAgo
        ).length;
        const readyForPickupCount = allOrders.filter((o) => o.status === "packed").length;

        const [failedShipments, bookingFailedShipments, lostShipments] = await Promise.all([
          ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "failed")).collect(),
          ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "booking_failed")).collect(),
          ctx.db.query("shipments").withIndex("by_status", q => q.eq("status", "lost")).collect(),
        ]);
        const courierExceptionsCount = failedShipments.length + bookingFailedShipments.length + lostShipments.length;

        const [pendingRefunds, processingRefunds] = await Promise.all([
          ctx.db.query("refundQueue").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
          ctx.db.query("refundQueue").withIndex("by_status", (q) => q.eq("status", "processing")).collect(),
        ]);
        const refundQueuePending = [...pendingRefunds, ...processingRefunds];
        const refundPendingCount = refundQueuePending.length;

        const pipelineCounts = {
          pending: allOrders.filter((o) => o.status === "pending_confirmation" || o.status === "pending_payment").length,
          confirmed: allOrders.filter((o) => o.status === "confirmed").length,
          packed: allOrders.filter((o) => o.status === "packed").length,
          pickup: allOrders.filter((o) => o.status === "pickup_scheduled" || o.status === "picked_up").length,
          delivered: allOrders.filter((o) => o.status === "delivered").length,
        };

        return {
          totalOrders,
          pendingOrders,
          deliveredOrders,
          totalRevenue,
          recentOrders,
          ordersPendingOver12h,
          ordersWaitingAcceptanceOver15m,
          averageAcceptanceDelayMins,
          claimsWaitingOver24h,
          suspendedBoutiquesCount,
          productsModeratedCount,
          totalProducts,
          outOfStockProductsCount,
          pendingDocumentsCount,
          pendingProductsReviewCount,
          commandCenterMetrics,
          isSandbox: process.env.ENABLE_DEBUG_TOOLS === "true",
          waitingOver15m,
          waitingOver30m,
          readyForPickupCount,
          courierExceptionsCount,
          refundPendingCount,
          pipelineCounts,
        };
      })(),

      // 5. Boutique applications (pending only)
      ctx.db.query("boutiqueApplications").withIndex("by_status", q => q.eq("status", "PENDING")).order("desc").take(50),

      // 6. Activity feed (last 20 items)
      (async () => {
        const [auditLogs, orders, claims, boutiqueApps] = await Promise.all([
          ctx.db.query("auditLogs").order("desc").take(25),
          ctx.db.query("orders").order("desc").take(20),
          ctx.db.query("claims").order("desc").take(20),
          ctx.db.query("boutiqueApplications").order("desc").take(20),
        ]);

        const enrichedLogs = await Promise.all(
          auditLogs.map(async (log) => {
            let actorEmail = "System";
            let actorName = "System Action";
            if (log.actorId) {
              const user = await ctx.db.get(log.actorId);
              if (user) {
                actorEmail = user.email || "No Email";
                const profile = await ctx.db
                  .query("customerProfiles")
                  .withIndex("by_userId", (q) => q.eq("userId", user._id))
                  .unique();
                actorName = profile?.displayName || user.email || "Admin User";
              }
            }
            let details = log.entityId;
            try {
              if (log.entityType === "products") {
                const prod = await ctx.db.get(log.entityId as any);
                if (prod) details = (prod as any).name;
              } else if (log.entityType === "boutiques") {
                const btq = await ctx.db.get(log.entityId as any);
                if (btq) details = (btq as any).boutiqueName;
              } else if (log.entityType === "categories") {
                const cat = await ctx.db.get(log.entityId as any);
                if (cat) details = (cat as any).name;
              }
            } catch {}

            let actionLabel = log.action;
            if (log.action === "product.moderated") actionLabel = "Product Hidden";
            else if (log.action === "product.unmoderated") actionLabel = "Product Moderation Lifted";
            else if (log.action === "product.deactivated_admin") actionLabel = "Product Deactivated";
            else if (log.action === "product.reactivated_admin") actionLabel = "Product Reactivated";
            else if (log.action === "boutique.suspended") actionLabel = "Boutique Suspended";
            else if (log.action === "boutique.activated") actionLabel = "Boutique Activated";

            return {
              id: log._id,
              type: "audit_log",
              timestamp: log.createdAt,
              action: actionLabel,
              details,
              actorName,
              actorEmail,
            };
          })
        );

        const enrichedOrders = await Promise.all(
          orders.map(async (order) => {
            const customer = await ctx.db.get(order.customerId);
            const customerProfile = customer
              ? await ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", customer._id)).unique()
              : null;
            const actorName = customerProfile?.displayName || customer?.email || "Customer";

            let actionLabel = "Order Placed";
            let timestamp = order.createdAt;

            if (order.status === "delivered") {
              actionLabel = "Order Delivered";
              timestamp = order.deliveredAt ?? order.updatedAt ?? order.createdAt;
            } else if (order.status === "cancelled") {
              actionLabel = "Order Cancelled";
              timestamp = order.cancelledAt ?? order.updatedAt ?? order.createdAt;
            } else if (order.status === "refunded") {
              actionLabel = "Refund Issued";
              timestamp = order.updatedAt ?? order.createdAt;
            }

            return {
              id: order._id,
              type: "order",
              timestamp,
              action: actionLabel,
              details: `Order #${order.orderNumber} (₹${((order.total || 0) / 100).toLocaleString("en-IN")})`,
              actorName,
              actorEmail: customer?.email || "",
            };
          })
        );

        const enrichedClaims = await Promise.all(
          claims.map(async (claim) => {
            let actorId = claim.customerId;
            const isResolution = ["refund_approved", "refunded", "rejected", "closed"].includes(claim.status);
            if (isResolution && claim.reviewedBy) {
              actorId = claim.reviewedBy;
            }

            const user = await ctx.db.get(actorId);
            let actorEmail = "";
            let actorName = "User";
            if (user) {
              actorEmail = user.email || "";
              const profile = await ctx.db
                .query("customerProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", user._id))
                .unique();
              actorName = profile?.displayName || user.email || (isResolution ? "Admin" : "Customer");
            }

            let actionLabel = "Claim Submitted";
            let timestamp = claim.submittedAt;

            if (claim.status === "refund_approved") {
              actionLabel = "Claim Approved";
              timestamp = claim.refundApprovedAt ?? claim.updatedAt ?? claim.submittedAt;
            } else if (claim.status === "refunded") {
              actionLabel = "Refund Issued";
              timestamp = claim.refundedAt ?? claim.updatedAt ?? claim.submittedAt;
            } else if (claim.status === "rejected") {
              actionLabel = "Claim Rejected";
              timestamp = claim.rejectedAt ?? claim.updatedAt ?? claim.submittedAt;
            } else if (claim.status === "closed") {
              actionLabel = "Claim Closed";
              timestamp = claim.closedAt ?? claim.updatedAt ?? claim.submittedAt;
            }

            const order = await ctx.db.get(claim.orderId);
            const details = order ? `Order ${order.orderNumber}` : `Claim ${claim.claimNumber}`;

            return {
              id: claim._id,
              type: "claim",
              timestamp,
              action: actionLabel,
              details,
              actorName,
              actorEmail,
            };
          })
        );

        const enrichedBoutiqueApps = await Promise.all(
          boutiqueApps.map(async (app) => {
            let actionLabel = "New Boutique Application";
            let timestamp = app.createdAt;
            let actorId = app.userId;

            if (app.status === "APPROVED") {
              actionLabel = "Boutique App Approved";
              timestamp = app.approvedAt ?? app.createdAt;
              if (app.approvedBy) {
                actorId = app.approvedBy;
              }
            } else if (app.status === "REJECTED") {
              actionLabel = "Boutique App Rejected";
              timestamp = app.createdAt;
            }

            let actorEmail = app.email;
            let actorName = app.ownerName;

            if (app.status === "APPROVED" || app.status === "REJECTED") {
              if (app.approvedBy) {
                const admin = await ctx.db.get(app.approvedBy);
                if (admin) {
                  actorEmail = admin.email || "";
                  const profile = await ctx.db
                    .query("customerProfiles")
                    .withIndex("by_userId", (q) => q.eq("userId", admin._id))
                    .unique();
                  actorName = profile?.displayName || admin.email || "Admin User";
                }
              }
            } else {
              const user = await ctx.db.get(app.userId);
              if (user) {
                actorEmail = user.email || app.email;
                const profile = await ctx.db
                  .query("customerProfiles")
                  .withIndex("by_userId", (q) => q.eq("userId", user._id))
                  .unique();
                actorName = profile?.displayName || app.ownerName;
              }
            }

            return {
              id: app._id,
              type: "boutique_application",
              timestamp,
              action: actionLabel,
              details: app.boutiqueName,
              actorName,
              actorEmail,
            };
          })
        );

        const feed = [
          ...enrichedLogs,
          ...enrichedOrders,
          ...enrichedClaims,
          ...enrichedBoutiqueApps,
        ];

        feed.sort((a, b) => b.timestamp - a.timestamp);
        return feed.slice(0, 20);
      })(),

      // 7. Founder onboarding metrics
      (async () => {
        const boutiquesList = await ctx.db.query("boutiques").collect();

        let invited = 0;
        let account_claimed = 0;
        let first_product_uploaded = 0;
        let profile_incomplete = 0;
        let launch_ready = 0;

        const newInviteRequests: any[] = [];
        const stuckInvites: any[] = [];
        const stuckClaimedNoProducts: any[] = [];
        const stuckCatalogApproval: any[] = [];
        const stuckLaunchReadyNoOrders: any[] = [];

        const now = Date.now();

        for (const b of boutiquesList) {
          const status = await determineOnboardingStatus(ctx, b);
          
          if (status === "invited") invited++;
          else if (status === "account_claimed") account_claimed++;
          else if (status === "first_product_uploaded") first_product_uploaded++;
          else if (status === "profile_incomplete") profile_incomplete++;
          else if (status === "launch_ready") launch_ready++;

          if (!b.ownerUserId && b.inviteRequestedAt !== undefined) {
            newInviteRequests.push({
              _id: b._id,
              boutiqueName: b.boutiqueName,
              ownerName: b.ownerName,
              email: b.email,
              phone: b.phone,
              inviteRequestedAt: b.inviteRequestedAt,
            });
          }

          let referenceTime = b.inviteSentAt || b.createdAt;
          if (b.claimedAt) {
            referenceTime = b.claimedAt;
          }
          const elapsedMs = now - referenceTime;
          const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

          if (status === "invited" && daysElapsed >= 3) {
            stuckInvites.push({
              _id: b._id,
              boutiqueName: b.boutiqueName,
              ownerName: b.ownerName,
              phone: b.phone,
              daysWaiting: daysElapsed,
            });
          }

          if (status === "account_claimed" && daysElapsed >= 3) {
            stuckClaimedNoProducts.push({
              _id: b._id,
              boutiqueName: b.boutiqueName,
              ownerName: b.ownerName,
              phone: b.phone,
              daysWaiting: daysElapsed,
            });
          }

          if (status === "first_product_uploaded" || status === "profile_incomplete") {
            const totalProducts = await ctx.db
              .query("products")
              .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
              .collect();
            const approvedCount = totalProducts.filter((p: any) => p.active && p.approvalStatus === "approved").length;

            if (totalProducts.length > 0 && approvedCount === 0) {
              stuckCatalogApproval.push({
                _id: b._id,
                boutiqueName: b.boutiqueName,
                ownerName: b.ownerName,
                phone: b.phone,
                uploadedCount: totalProducts.length,
              });
            }
          }

          if (status === "launch_ready") {
            const ordersList = await ctx.db
              .query("orders")
              .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
              .take(1);
            
            if (ordersList.length === 0 && daysElapsed >= 7) {
              stuckLaunchReadyNoOrders.push({
                _id: b._id,
                boutiqueName: b.boutiqueName,
                ownerName: b.ownerName,
                phone: b.phone,
                daysActive: daysElapsed,
              });
            }
          }
        }

        return {
          funnel: {
            invited,
            account_claimed,
            first_product_uploaded,
            profile_incomplete,
            launch_ready,
          },
          newInviteRequests,
          stuckInvites,
          stuckClaimedNoProducts,
          stuckCatalogApproval,
          stuckLaunchReadyNoOrders,
        };
      })(),
    ]);

    return {
      boutiques: boutiquesData,
      categories,
      banners,
      metrics,
      applications,
      activityFeed,
      onboardingMetrics,
    };
  },
});

type ExtractQueryReturnType<T> = T extends RegisteredQuery<any, any, infer R> ? Awaited<R> : never;
export type AdminCombinedDashboardData = ExtractQueryReturnType<typeof getAdminCombinedDashboardData>;
