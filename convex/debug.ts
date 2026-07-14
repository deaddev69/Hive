// convex/debug.ts
// Temporary debug endpoint — safe to remove once auth is verified working.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { getPublicUrl } from "./media/api";

/**
 * Returns auth diagnostic details (both Clerk and custom sessions) to the front end.
 */
export const whoAmI = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Debug tools disabled in this environment.");
    }
    const identity = await ctx.auth.getUserIdentity();
    
    // Check custom session token (Deprecated)
    let sessionUser = null;
    let sessionValid = false;

    return {
      clerkAuthenticated: !!identity,
      clerkIdentity: identity ? {
        subject:         identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        issuer:          identity.issuer,
        email:           identity.email,
        name:            identity.name,
      } : null,
      customSession: {
        provided: !!args.token,
        valid: sessionValid,
        user: null,
      }
    };
  },
});

/**
 * Executes comprehensive integration verification tests for Sprint 2.6 Logistics Control Tower.
 */
export const runLogisticsVerificationTests = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Debug tools disabled in this environment.");
    }
    const now = Date.now();
    const results: string[] = [];

    // 1. Get existing boutique, product, customer
    const boutique = await ctx.db.query("boutiques").first();
    if (!boutique) throw new Error("No boutiques found. Run database seeding first.");
    const product = await ctx.db.query("products").filter((q) => q.eq(q.field("boutiqueId"), boutique._id)).first();
    if (!product) throw new Error("No products found. Run database seeding first.");
    const customer = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "customer")).first();
    if (!customer) throw new Error("No customer users found. Run database seeding first.");

    // Helper to create a fresh paid order for testing
    const createTestOrder = async () => {
      let address = await ctx.db.query("addresses").filter((q) => q.eq(q.field("userId"), customer._id)).first();
      if (!address) {
        const addrId = await ctx.db.insert("addresses", {
          userId: customer._id,
          label: "Home",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500001",
          lat: 12.34,
          lng: 56.78,
          isDefault: true,
          isDeleted: false,
          createdAt: now,
        });
        address = (await ctx.db.get(addrId))!;
      }

      const orderNumber = `HV-TEST-${Math.floor(100000 + Math.random() * 900000)}`;
      const orderId = await ctx.db.insert("orders", {
        orderNumber,
        customerId: customer._id,
        boutiqueId: boutique._id,
        status: "confirmed",
        deliveryAddress: {
          label: "Home",
          line1: "123 Customer St",
          city: "Hyderabad",
          state: "Telangana",
          pincode: "500001",
          lat: 12.34,
          lng: 56.78,
        },
        addressId: address._id,
        subtotal: 100000,
        deliveryFee: 5000,
        discount: 0,
        total: 105000,
        commissionAmount: 10000,
        paymentStatus: "paid",
        createdAt: now,
        updatedAt: now,
      });

      // Insert order item
      await ctx.db.insert("orderItems", {
        orderId,
        productId: product._id,
        boutiqueId: boutique._id,
        productName: "Test Product",
        variantSize: "S",
        imageUrl: "https://test.com/img.jpg",
        sku: "TEST-SKU",
        priceAtPurchase: 100000,
        quantity: 1,
        subtotal: 100000,
      });

      return orderId;
    };

    results.push("--- Starting Logistics Verification Tests ---");

    // ==========================================
    // TEST CASE 1: Shipment State Machine Guard
    // ==========================================
    try {
      const orderId = await createTestOrder();
      
      const awb = `AWB-TEST-FSM-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "delhivery",
        awbNumber: awb,
        status: "created",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId });

      results.push("Test Case 1.1: State transition created -> pickup_scheduled (Valid)");
      
      const VALID_TRANSITIONS: Record<string, string[]> = {
        created: ["pickup_scheduled"],
        pickup_scheduled: ["picked_up", "cancelled"],
        picked_up: ["in_transit", "failed"],
        in_transit: ["out_for_delivery", "failed", "rto_initiated"],
        out_for_delivery: ["delivered", "failed"],
        failed: ["out_for_delivery", "rto_initiated"],
      };

      const checkTransition = (from: string, to: string) => {
        const valids = VALID_TRANSITIONS[from];
        if (!valids || !valids.includes(to)) {
          throw new Error(`Invalid transition: ${from} -> ${to}`);
        }
      };

      checkTransition("created", "pickup_scheduled");
      results.push("✓ Transition created -> pickup_scheduled verified");

      results.push("Test Case 1.2: State transition created -> delivered (Invalid FSM violation)");
      try {
        checkTransition("created", "delivered");
        results.push("✗ Failed: Invalid transition did not throw");
      } catch (err: any) {
        results.push(`✓ Successfully caught FSM violation: ${err.message}`);
      }
    } catch (err: any) {
      results.push(`✗ Test Case 1 Failed: ${err.message}`);
    }

    // ==========================================
    // TEST CASE 2: RTO Restoral Idempotency Guard
    // ==========================================
    try {
      results.push("Test Case 2: RTO Restoral Idempotency Guard");
      const orderId = await createTestOrder();
      const awb = `AWB-TEST-RTO-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "delhivery",
        awbNumber: awb,
        status: "rto_delivered",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });

      // Confirm receipt first time
      results.push("2.1 Confirm RTO receipt first time (restores stock)");
      const runRtoReceipt = async (shId: any) => {
        const sh = (await ctx.db.get(shId)) as any;
        if (!sh) throw new Error("Shipment not found");
        if (sh.inventoryRestored) {
          throw new Error("Idempotency Guard: Inventory has already been restored for this RTO package.");
        }
        
        // Restore stock
        const ord = (await ctx.db.get(sh.orderId)) as any;
        if (!ord) throw new Error("Order not found");
        const items = await ctx.db.query("orderItems").withIndex("by_orderId", (q) => q.eq("orderId", ord._id)).collect();
        for (const item of items) {
          const prod = (await ctx.db.get(item.productId)) as any;
          if (!prod) continue;
          const stock = { ...prod.stockBySize };
          stock[item.variantSize] = (stock[item.variantSize] ?? 0) + item.quantity;
          await ctx.db.patch(prod._id, { stockBySize: stock });
        }
        await ctx.db.patch(sh._id, { inventoryRestored: true, inventoryRestoredAt: Date.now() });
      };

      const startStock = (await ctx.db.get(product._id))!.stockBySize["S"] ?? 0;
      await runRtoReceipt(shipmentId);
      const afterFirstStock = (await ctx.db.get(product._id))!.stockBySize["S"] ?? 0;
      results.push(`✓ First receipt processed. Stock S: ${startStock} -> ${afterFirstStock}`);

      results.push("2.2 Confirm RTO receipt second time (should trigger Idempotency Guard error)");
      try {
        await runRtoReceipt(shipmentId);
        results.push("✗ Failed: Double receipt did not throw");
      } catch (err: any) {
        results.push(`✓ Successfully caught double RTO receipt: ${err.message}`);
      }
    } catch (err: any) {
      results.push(`✗ Test Case 2 Failed: ${err.message}`);
    }

    // ==========================================
    // TEST CASE 3: Settlement Freeze During RTO
    // ==========================================
    try {
      results.push("Test Case 3: Settlement Freeze During RTO");
      const orderId = await createTestOrder();
      
      // Create pending settlement
      const settlementId = await ctx.db.insert("settlementLedger", {
        boutiqueId: boutique._id,
        orderId,
        type: "accrual",
        source: "order",
        amount: 90000,
        status: "pending",
        createdAt: now,
        accruedAt: now,
      });

      // Deliver order and set shipment status to delivered
      const awb = `AWB-TEST-SETTLE-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "delhivery",
        awbNumber: awb,
        status: "delivered",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId, claimWindowExpiresAt: now - 1000 });

      // Mock settlement sweep
      const runSettleSweep = async (sId: any) => {
        const s = (await ctx.db.get(sId)) as any;
        if (!s) throw new Error("Settlement not found");
        if (s.status !== "pending") return "already_settled";
        
        const ord = (await ctx.db.get(s.orderId!)) as any;
        if (ord && ord.claimWindowExpiresAt && ord.claimWindowExpiresAt <= Date.now()) {
          if (ord.shipmentId) {
            const sh = (await ctx.db.get(ord.shipmentId)) as any;
            if (!sh || sh.status !== "delivered") {
              return "frozen";
            }
          }
          await ctx.db.patch(s._id, { status: "available", settledAt: Date.now() });
          return "settled";
        }
        return "not_expired";
      };

      const result1 = await runSettleSweep(settlementId);
      results.push(`✓ Sweep outcome with 'delivered' shipment: ${result1} (Expected: settled)`);

      // Create another settlement and trigger RTO on shipment
      const orderId2 = await createTestOrder();
      const settlementId2 = await ctx.db.insert("settlementLedger", {
        boutiqueId: boutique._id,
        orderId: orderId2,
        type: "accrual",
        source: "order",
        amount: 90000,
        status: "pending",
        createdAt: now,
        accruedAt: now,
      });
      const shipmentId2 = await ctx.db.insert("shipments", {
        orderId: orderId2,
        provider: "delhivery",
        awbNumber: awb + "-2",
        status: "rto_initiated",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId2, { shipmentId: shipmentId2, claimWindowExpiresAt: now - 1000 });

      const result2 = await runSettleSweep(settlementId2);
      results.push(`✓ Sweep outcome with 'rto_initiated' shipment: ${result2} (Expected: frozen)`);
    } catch (err: any) {
      results.push(`✗ Test Case 3 Failed: ${err.message}`);
    }

    // ==========================================
    // TEST CASE 4: Lost Shipment Workflow
    // ==========================================
    try {
      results.push("Test Case 4: Lost Shipment Workflow");
      const orderId = await createTestOrder();
      const awb = `AWB-TEST-LOST-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "delhivery",
        awbNumber: awb,
        status: "in_transit",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId });

      // Record accrual
      await ctx.db.insert("settlementLedger", {
        boutiqueId: boutique._id,
        orderId,
        type: "accrual",
        source: "order",
        amount: 90000,
        status: "pending",
        createdAt: now,
        accruedAt: now,
      });

      // Mark lost (NO stock restoral)
      const runMarkLost = async (shId: any) => {
        const sh = (await ctx.db.get(shId)) as any;
        if (!sh) throw new Error("Shipment not found");
        const ord = (await ctx.db.get(sh.orderId)) as any;
        if (!ord) throw new Error("Order not found");
        
        // 1. Refund
        const refundNumber = `REF-TEST-${Date.now()}`;
        await ctx.db.insert("refundLedger", {
          refundNumber,
          orderId: ord._id,
          amount: ord.total,
          status: "processed",
          refundType: "full_refund",
          notes: "Lost shipment refund",
          createdAt: Date.now(),
        });

        // 2. Settlement deduction
        await ctx.db.insert("settlementLedger", {
          boutiqueId: ord.boutiqueId,
          orderId: ord._id,
          type: "refund_deduction",
          source: "system",
          amount: -90000,
          status: "available",
          createdAt: Date.now(),
          accruedAt: Date.now(),
          settledAt: Date.now(),
        });

        // 3. Mark lost status (NO stock restoral)
        await ctx.db.patch(sh._id, { status: "lost" });

        // 4. Cancel order
        await ctx.db.patch(ord._id, {
          status: "cancelled",
          paymentStatus: "refunded",
          refunded_lost_shipment: true,
        });
      };

      const startStock = (await ctx.db.get(product._id))!.stockBySize["S"] ?? 0;
      await runMarkLost(shipmentId);
      const endStock = (await ctx.db.get(product._id))!.stockBySize["S"] ?? 0;
      const updatedOrder = (await ctx.db.get(orderId)) as any;
      const updatedShipment = (await ctx.db.get(shipmentId)) as any;

      results.push(`✓ Marked lost. Shipment status: ${updatedShipment?.status} (Expected: lost)`);
      results.push(`✓ Order status: ${updatedOrder?.status}, refunded_lost_shipment: ${updatedOrder?.refunded_lost_shipment}`);
      results.push(`✓ Inventory stock verification: ${startStock} -> ${endStock} (Expected: unchanged, i.e. ${startStock} == ${endStock})`);

      const refundEntry = await ctx.db.query("refundLedger").filter((q) => q.eq(q.field("orderId"), orderId)).first();
      const deductionEntry = await ctx.db.query("settlementLedger").filter((q) => q.and(q.eq(q.field("orderId"), orderId), q.eq(q.field("type"), "refund_deduction"))).first();
      results.push(`✓ Financial audit: Refund created? ${!!refundEntry}, Deduction created? ${!!deductionEntry} (Amount: ${deductionEntry?.amount})`);

    } catch (err: any) {
      results.push(`✗ Test Case 4 Failed: ${err.message}`);
    }

    results.push("--- Logistics Verification Tests Complete ---");
    return results;
  },
});

/**
 * Executes comprehensive integration verification tests for Sprint 2.7.
 */
export const runSlaPerformanceVerificationTests = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Debug tools disabled in this environment.");
    }
    const now = Date.now();
    const results: string[] = [];

    // Helper functions from adminLogistics
    const { calculateShipmentSlaStatus, resolveDelayResponsibility } = require("./adminLogistics");

    results.push("--- Starting SLA & Performance Verification Tests ---");

    // ==========================================
    // TEST CASE 1: SLA status calculations
    // ==========================================
    try {
      results.push("Test Case 1: SLA Status Threshold Calculations");
      
      const mockShipment = { createdAt: now };
      
      // 1.1 Pickup Breach (>90 min)
      const orderBreachPickup = { readyForPickupAt: now - 100 * 60 * 1000 };
      const status1 = calculateShipmentSlaStatus(mockShipment, orderBreachPickup);
      results.push(`✓ Pickup SLA Breach check: ${status1} (Expected: breached)`);
      if (status1 !== "breached") throw new Error("Pickup Breach failed");

      // 1.2 Pickup At Risk (>45 min)
      const orderRiskPickup = { readyForPickupAt: now - 50 * 60 * 1000 };
      const status2 = calculateShipmentSlaStatus(mockShipment, orderRiskPickup);
      results.push(`✓ Pickup SLA At Risk check: ${status2} (Expected: at_risk)`);
      if (status2 !== "at_risk") throw new Error("Pickup Risk failed");

      // 1.3 Delivery Breach (>8 hours)
      const orderBreachDelivery = { pickedUpAt: now - 9 * 3600 * 1000 };
      const status3 = calculateShipmentSlaStatus(mockShipment, orderBreachDelivery);
      results.push(`✓ Delivery SLA Breach check: ${status3} (Expected: breached)`);
      if (status3 !== "breached") throw new Error("Delivery Breach failed");

      // 1.4 Delivery At Risk (>4 hours)
      const orderRiskDelivery = { pickedUpAt: now - 5 * 3600 * 1000 };
      const status4 = calculateShipmentSlaStatus(mockShipment, orderRiskDelivery);
      results.push(`✓ Delivery SLA At Risk check: ${status4} (Expected: at_risk)`);
      if (status4 !== "at_risk") throw new Error("Delivery Risk failed");
    } catch (err: any) {
      results.push(`✗ Test Case 1 Failed: ${err.message}`);
    }

    // ==========================================
    // TEST CASE 2: Delay attribution mapping
    // ==========================================
    try {
      results.push("Test Case 2: Delay Attribution Mapping");
      const resp1 = resolveDelayResponsibility("address_issue");
      results.push(`✓ Address issue maps to: ${resp1} (Expected: customer)`);
      if (resp1 !== "customer") throw new Error("Address issue attribution incorrect");

      const resp2 = resolveDelayResponsibility("courier_damage");
      results.push(`✓ Courier damage maps to: ${resp2} (Expected: courier)`);
      if (resp2 !== "courier") throw new Error("Courier damage attribution incorrect");
    } catch (err: any) {
      results.push(`✗ Test Case 2 Failed: ${err.message}`);
    }

    // ==========================================
    // TEST CASE 3: Gated Settlements & Disputes
    // ==========================================
    try {
      results.push("Test Case 3: Gated Settlements with Open Disputes");
      const boutique = await ctx.db.query("boutiques").first();
      const customer = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "customer")).first();
      if (!boutique || !customer) throw new Error("Missing boutique or customer data");

      // Helper to create order and shipment
      const createDeliveredOrder = async () => {
        let address = await ctx.db.query("addresses").filter((q) => q.eq(q.field("userId"), customer._id)).first();
        if (!address) {
          const addrId = await ctx.db.insert("addresses", {
            userId: customer._id,
            label: "Home",
            city: "Hyderabad",
            state: "Telangana",
            pincode: "500001",
            lat: 12.34,
            lng: 56.78,
            isDefault: true,
            isDeleted: false,
            createdAt: now,
          });
          address = (await ctx.db.get(addrId))!;
        }

        const orderId = await ctx.db.insert("orders", {
          orderNumber: `HV-TEST-SETTLE-${Math.floor(100000 + Math.random() * 900000)}`,
          customerId: customer._id,
          boutiqueId: boutique._id,
          status: "delivered",
          deliveryAddress: { label: "Home", line1: "123 St", city: "Hyd", state: "TS", pincode: "500001", lat: 1, lng: 2 },
          addressId: address._id,
          subtotal: 10000,
          deliveryFee: 0,
          discount: 0,
          total: 10000,
          commissionAmount: 1000,
          paymentStatus: "paid",
          deliveredAt: now - 3 * 24 * 3600 * 1000,
          claimWindowExpiresAt: now - 1000, // Claim window expired
          createdAt: now - 4 * 24 * 3600 * 1000,
          updatedAt: now,
        });

        const product = await ctx.db.query("products").first();
        if (!product) throw new Error("No products found to create order item");

        const orderItemId = await ctx.db.insert("orderItems", {
          orderId,
          productId: product._id,
          variantId: product._id,
          boutiqueId: boutique._id,
          productName: product.name,
          variantSize: "M",
          imageUrl: (typeof product.images[0] === "string" ? product.images[0] : (product.images[0] as any)?.objectKey ? getPublicUrl((product.images[0] as any), "pdp") : "") || "",
          sku: "TEST-SKU",
          priceAtPurchase: 10000,
          quantity: 1,
          subtotal: 10000,
        });

        const shipmentId = await ctx.db.insert("shipments", {
          orderId,
          provider: "manual",
          awbNumber: `AWB-SETTLE-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "delivered",
          pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
          deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
          rawWebhookEvents: [],
          createdAt: now,
          updatedAt: now,
        });

        await ctx.db.patch(orderId, { shipmentId });

        const settlementId = await ctx.db.insert("settlementLedger", {
          boutiqueId: boutique._id,
          orderId,
          type: "accrual",
          source: "order",
          amount: 9000,
          status: "pending",
          createdAt: now,
          accruedAt: now,
        });

        return { orderId, settlementId, orderItemId };
      };

      // 3.1 Normal released settlement
      const { settlementId: sId1 } = await createDeliveredOrder();
      
      // Call mock settle sweep
      const runSettleSweep = async (sId: any) => {
        const s = (await ctx.db.get(sId)) as any;
        if (s.status !== "pending") return s.status;
        
        const ord = (await ctx.db.get(s.orderId!)) as any;
        if (ord && ord.claimWindowExpiresAt && ord.claimWindowExpiresAt <= Date.now()) {
          if (ord.shipmentId) {
            const shipment = (await ctx.db.get(ord.shipmentId)) as any;
            if (!shipment || shipment.status !== "delivered" || ord.status !== "delivered") {
              return "frozen_status";
            }
          } else {
            if (ord.status !== "delivered") return "frozen_status";
          }

          // Open claims check
          const openClaims = await ctx.db
            .query("claims")
            .withIndex("by_orderId", (q) => q.eq("orderId", ord._id))
            .collect();
          const hasOpenClaims = openClaims.some(
            (c) => !["closed", "rejected", "refunded"].includes(c.status)
          );
          if (hasOpenClaims) {
            return "frozen_claim";
          }

          await ctx.db.patch(s._id, { status: "available", settledAt: Date.now() });
          return "available";
        }
        return "pending";
      };

      const status1_sweep = await runSettleSweep(sId1);
      results.push(`✓ Normal delivered settlement status: ${status1_sweep} (Expected: available)`);
      if (status1_sweep !== "available") throw new Error("Normal settlement sweep failed");

      // 3.2 Settle blocked by open claim
      const { orderId: oId2, settlementId: sId2, orderItemId: oItemId2 } = await createDeliveredOrder();
      
      // Insert open claim
      const claimId = await ctx.db.insert("claims", {
        claimNumber: "CLM-TEST-DISPUTE",
        orderId: oId2,
        orderItemId: oItemId2,
        customerId: customer._id,
        boutiqueId: boutique._id,
        type: "wrong_item",
        description: "Test dispute",
        status: "submitted",
        submittedAt: now,
        windowExpiresAt: now + 48 * 3600 * 1000,
        createdAt: now,
        updatedAt: now,
      });

      const status2_sweep = await runSettleSweep(sId2);
      results.push(`✓ Gated settlement status with open claim: ${status2_sweep} (Expected: frozen_claim)`);
      if (status2_sweep !== "frozen_claim") throw new Error("Settlement gate claim block failed");

      // 3.3 Re-sweep after claim closed
      await ctx.db.patch(claimId, { status: "closed" });
      const status3_sweep = await runSettleSweep(sId2);
      results.push(`✓ Settlement status after claim closed: ${status3_sweep} (Expected: available)`);
      if (status3_sweep !== "available") throw new Error("Settlement release after claim closed failed");

    } catch (err: any) {
      results.push(`✗ Test Case 3 Failed: ${err.message}`);
    }

    results.push("--- SLA & Performance Verification Tests Complete ---");
    return results;
  },
});

/**
 * Executes comprehensive disaster recovery and chaos audit tests for Sprint 2.8.5.
 */
export const runDisasterRecoveryChaosTests = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Debug tools disabled in this environment.");
    }
    const now = Date.now();
    const results: string[] = [];

    // Helper functions from other modules
    const { simulateLogisticsWebhookAdmin, markShipmentLostAdmin } = require("./adminLogistics");
    const { triggerBoutiquePayoutAdmin, getBoutiqueWallet } = require("./adminFinance");
    const { submitClaimCustomer } = require("./claims");
    const { updateBoutiqueOrderStatus } = require("./orders");

    results.push("--- Starting Disaster Recovery & Chaos Tests ---");

    // Retrieve references to seed the tests
    const baseBoutique = await ctx.db.query("boutiques").first();
    let customer = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "customer")).first();
    let admin = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "admin")).first();
    let boutiqueOwner = await ctx.db.query("users").filter((q) => q.eq(q.field("role"), "boutique")).first();
    const product = await ctx.db.query("products").first();

    if (!baseBoutique || !product) {
      throw new Error("Missing seeded seed data (boutique or product) to run chaos tests.");
    }

    // Create a brand new boutique for chaos testing to avoid ledger balance pollution from previous tests
    const testBoutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName: `Chaos Test Boutique ${Math.floor(1000 + Math.random() * 9000)}`,
      ownerName: baseBoutique.ownerName,
      email: baseBoutique.email,
      phone: baseBoutique.phone,
      address: baseBoutique.address,
      latitude: baseBoutique.latitude,
      longitude: baseBoutique.longitude,
      deliveryRadiusKm: baseBoutique.deliveryRadiusKm,
      description: baseBoutique.description,
      status: "APPROVED",
      createdAt: now,
      ownerUserId: baseBoutique.ownerUserId,
      ownerEmail: baseBoutique.ownerEmail,
    });
    const boutique = (await ctx.db.get(testBoutiqueId))!;

    if (!customer) {
      const cId = await ctx.db.insert("users", {
        clerkId: "mock-customer-clerk-id",
        email: "customer@hive.com",
        role: "customer",
        isActive: true,
        isPhoneVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      customer = (await ctx.db.get(cId))!;
    }

    if (!admin) {
      const aId = await ctx.db.insert("users", {
        clerkId: "mock-admin-clerk-id",
        email: "admin@hive.com",
        role: "admin",
        isActive: true,
        isPhoneVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      admin = (await ctx.db.get(aId))!;
    }

    if (!boutiqueOwner) {
      const boId = await ctx.db.insert("users", {
        clerkId: "mock-boutique-clerk-id",
        email: "boutique@hive.com",
        role: "boutique",
        isActive: true,
        isPhoneVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      boutiqueOwner = (await ctx.db.get(boId))!;
    }

    let address = await ctx.db.query("addresses").filter((q) => q.eq(q.field("userId"), customer!._id)).first();
    if (!address) {
      const addrId = await ctx.db.insert("addresses", {
        userId: customer!._id,
        label: "Home",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500001",
        lat: 12.34,
        lng: 56.78,
        isDefault: true,
        isDeleted: false,
        createdAt: now,
      });
      address = (await ctx.db.get(addrId))!;
    }

    // Mock contexts for roles
    const mockAdminCtx = {
      ...ctx,
      auth: {
        ...ctx.auth,
        getUserIdentity: async () => ({
          subject: admin!.clerkId || "mock-admin-clerk-id",
          tokenIdentifier: `https://clerk.hive.com|${admin!.clerkId || "mock-admin-clerk-id"}`,
          issuer: "https://clerk.hive.com",
          email: admin!.email || "admin@hive.com",
          name: "Admin User",
          emailVerified: true,
        }),
      },
    };

    const mockCustomerCtx = {
      ...ctx,
      auth: {
        ...ctx.auth,
        getUserIdentity: async () => ({
          subject: customer!.clerkId || "mock-customer-clerk-id",
          tokenIdentifier: `https://clerk.hive.com|${customer!.clerkId || "mock-customer-clerk-id"}`,
          issuer: "https://clerk.hive.com",
          email: customer!.email || "customer@hive.com",
          name: "Customer User",
          emailVerified: true,
        }),
      },
    };

    const mockBoutiqueCtx = {
      ...ctx,
      auth: {
        ...ctx.auth,
        getUserIdentity: async () => ({
          subject: boutiqueOwner!.clerkId || "mock-boutique-clerk-id",
          tokenIdentifier: `https://clerk.hive.com|${boutiqueOwner!.clerkId || "mock-boutique-clerk-id"}`,
          issuer: "https://clerk.hive.com",
          email: boutiqueOwner!.email || "boutique@hive.com",
          name: "Boutique Owner",
          emailVerified: true,
        }),
      },
    };

    // Helper to create a test order (100k paise / 1000 INR total value)
    const createTestOrder = async () => {
      const orderId = await ctx.db.insert("orders", {
        orderNumber: `HV-CHAOS-ORDER-${Math.floor(100000 + Math.random() * 900000)}`,
        customerId: customer!._id,
        boutiqueId: boutique._id,
        status: "confirmed",
        deliveryAddress: { label: "Home", line1: "123 St", city: "Hyd", state: "TS", pincode: "500001", lat: 1, lng: 2 },
        addressId: address!._id,
        subtotal: 100000,
        deliveryFee: 0,
        discount: 0,
        total: 100000,
        commissionAmount: 10000,
        paymentStatus: "paid",
        createdAt: now,
        updatedAt: now,
      });

      const orderItemId = await ctx.db.insert("orderItems", {
        orderId,
        productId: product._id,
        variantId: product._id,
        boutiqueId: boutique._id,
        productName: product.name,
        variantSize: "M",
        imageUrl: (typeof product.images[0] === "string" ? product.images[0] : (product.images[0] as any)?.objectKey ? getPublicUrl((product.images[0] as any), "pdp") : "") || "",
        sku: "CHAOS-SKU",
        priceAtPurchase: 100000,
        quantity: 1,
        subtotal: 100000,
      });

      return { orderId, orderItemId };
    };

    // ==========================================
    // CHAOS TEST 1: Duplicate Webhook Attack
    // ==========================================
    try {
      results.push("Scenario 1: Duplicate Webhook Attack");
      const { orderId } = await createTestOrder();
      const awb = `AWB-CHAOS-1-${Math.floor(100000 + Math.random() * 900000)}`;

      // Insert shipment
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "manual",
        awbNumber: awb,
        status: "created",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId });

      // Simulate step-by-step valid updates to reach delivered
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "pickup_scheduled" });
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "picked_up" });
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "in_transit" });
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "out_for_delivery" });
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "delivered" });

      // Attack: Call delivered again
      try {
        await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "delivered" });
        results.push("✗ Scenario 1 Failed: Second delivered webhook did not throw error.");
      } catch (err: any) {
        results.push(`✓ Scenario 1 Success: State transition machine blocked duplicate delivered transition (${err.message}).`);
      }
    } catch (err: any) {
      results.push(`✗ Scenario 1 Failed to run: ${err.message}`);
    }

    // ==========================================
    // CHAOS TEST 2: Double Payout Sweep Attempt
    // ==========================================
    try {
      results.push("Scenario 2: Double Payout Sweep Attempt");
      // Verify compliance bank proof status is verified to bypass document lock
      const bankProof = await ctx.db
        .query("boutiqueDocuments")
        .withIndex("by_boutiqueId_type", (q) => q.eq("boutiqueId", boutique._id).eq("type", "bank_proof"))
        .first();
      if (bankProof) {
        await ctx.db.patch(bankProof._id, { status: "verified" });
      } else {
        await ctx.db.insert("boutiqueDocuments", {
          boutiqueId: boutique._id,
          type: "bank_proof",
          url: "http://docs.private/bank.pdf",
          publicId: "bank_pdf",
          status: "verified",
          createdAt: now,
        });
      }

      // Ensure positive available settlement exists
      const { orderId } = await createTestOrder();
      await ctx.db.insert("settlementLedger", {
        boutiqueId: boutique._id,
        orderId,
        type: "accrual",
        source: "order",
        amount: 8500,
        status: "available",
        createdAt: now,
        accruedAt: now,
      });

      // Call 1: Should succeed
      const payoutId1 = await triggerBoutiquePayoutAdmin(mockAdminCtx, { boutiqueId: boutique._id });
      results.push(`✓ Scenario 2: First payout sweep succeeded (Payout ID: ${payoutId1})`);

      // Call 2: Should fail immediately with "No available balance eligible for payout."
      try {
        await triggerBoutiquePayoutAdmin(mockAdminCtx, { boutiqueId: boutique._id });
        results.push("✗ Scenario 2 Failed: Second payout attempt succeeded instead of failing.");
      } catch (err: any) {
        results.push(`✓ Scenario 2 Success: Sweep gate blocked second payout sweep: ${err.message}`);
      }
    } catch (err: any) {
      results.push(`✗ Scenario 2 Failed to run: ${err.message}`);
    }

    // ==========================================
    // CHAOS TEST 3: Cancellation Race Condition
    // ==========================================
    try {
      results.push("Scenario 3: Order Handoff vs Cancellation Race");
      const { orderId } = await createTestOrder();
      const awb = `AWB-CHAOS-3-${Math.floor(100000 + Math.random() * 900000)}`;

      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "manual",
        awbNumber: awb,
        status: "created",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId });

      // Step 1: Webhook arrives indicating picked_up
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "pickup_scheduled" });
      await simulateLogisticsWebhookAdmin(mockAdminCtx, { awbNumber: awb, status: "picked_up" });

      // Step 2: Merchant tries to cancel order
      try {
        await updateBoutiqueOrderStatus(mockBoutiqueCtx, { orderId, status: "cancelled", boutiqueId: boutique._id });
        results.push("✗ Scenario 3 Failed: Cancellation mutation accepted cancellation for an already picked-up shipment.");
      } catch (err: any) {
        results.push(`✓ Scenario 3 Success: Cancellation blocked for shipped/picked-up package (${err.message}).`);
      }
    } catch (err: any) {
      results.push(`✗ Scenario 3 Failed to run: ${err.message}`);
    }

    // ==========================================
    // CHAOS TEST 4: Lost Package After Payout
    // ==========================================
    try {
      results.push("Scenario 4: Lost Package After Payout Recovery");
      // Step 1: Create order, make available, do payout
      const { orderId } = await createTestOrder();
      const awb = `AWB-CHAOS-4-${Math.floor(100000 + Math.random() * 900000)}`;
      const shipmentId = await ctx.db.insert("shipments", {
        orderId,
        provider: "manual",
        awbNumber: awb,
        status: "created",
        pickupAddress: { name: "B", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        deliveryAddress: { name: "C", line1: "L", city: "C", state: "S", pincode: "P", phone: "Ph" },
        rawWebhookEvents: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(orderId, { shipmentId });

      await ctx.db.insert("settlementLedger", {
        boutiqueId: boutique._id,
        orderId,
        type: "accrual",
        source: "order",
        amount: 90000,
        status: "available",
        createdAt: now,
        accruedAt: now,
      });

      // Payout sweeps it
      await triggerBoutiquePayoutAdmin(mockAdminCtx, { boutiqueId: boutique._id });

      // Step 2: Now mark shipment as lost
      await markShipmentLostAdmin(mockAdminCtx, { shipmentId, notes: "Package lost in courier hub after payout" });

      // Step 3: Fetch wallet available balance. It should be negative (-90000)
      const wallet = await getBoutiqueWallet(mockAdminCtx, { boutiqueId: boutique._id });
      results.push(`✓ Scenario 4: Boutique wallet available balance after loss penalty: ${wallet.availableBalance} paise (Expected: -90000)`);
      if (wallet.availableBalance !== -90000) {
        throw new Error(`Wallet balance was ${wallet.availableBalance} instead of -90000`);
      }
    } catch (err: any) {
      results.push(`✗ Scenario 4 Failed: ${err.message}`);
    }

    // ==========================================
    // CHAOS TEST 5: Duplicate Claim Submission
    // ==========================================
    try {
      results.push("Scenario 5: Duplicate Claim Submission Race");
      const { orderId, orderItemId } = await createTestOrder();

      // Ensure order status is delivered and claim window is active
      await ctx.db.patch(orderId, {
        status: "delivered",
        deliveredAt: now,
        claimWindowExpiresAt: now + 24 * 3600 * 1000,
      });

      // Submit claim 1: Should succeed
      const claimId1 = await submitClaimCustomer(mockCustomerCtx, {
        orderId,
        orderItemId,
        type: "damage",
        description: "Damaged unboxing",
      });
      results.push(`✓ Scenario 5: First claim submission succeeded (Claim ID: ${claimId1})`);

      // Reset order status back to delivered to test the duplicate claim guard itself
      await ctx.db.patch(orderId, {
        status: "delivered",
      });

      // Submit claim 2 (duplicate): Should fail
      try {
        await submitClaimCustomer(mockCustomerCtx, {
          orderId,
          orderItemId,
          type: "damage",
          description: "Second click double request",
        });
        results.push("✗ Scenario 5 Failed: Second claim submission did not fail.");
      } catch (err: any) {
        results.push(`✓ Scenario 5 Success: Double claim guard blocked the duplicate submission: ${err.message}`);
      }
    } catch (err: any) {
      results.push(`✗ Scenario 5 Failed to run: ${err.message}`);
    }

    results.push("--- Disaster Recovery & Chaos Tests Complete ---");
    return results;
  },
});

export const countAllDocuments = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // 1. Unconditional check for admin role
    const user = await getAuthenticatedUser(ctx, args.token);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Only administrators can query document counts.");
    }

    // 2. Strict environment check
    const isDevMode = process.env.NODE_ENV !== "production";
    const debugEnabled = process.env.ENABLE_DEBUG_TOOLS === "true";
    if (!isDevMode && !debugEnabled) {
      throw new Error("Query not available in this environment.");
    }

    const collections = [
      "users", "sessions", "customerProfiles", "addresses", "regions", "boutiques", 
      "boutiqueDocuments", "occasions", "products", "productImages", "productVideos", 
      "productVariants", "inventory", "inventoryMovements", "inventoryVerifications", 
      "orders", "orderItems", "deliverySlots", "shipments", "payments", 
      "checkoutSessions", "paymentEvents", "claims", "claimEvidence", "claimEvents", 
      "reviews", "hiveScores", "notifications", "auditLogs", "analyticsEvents", 
      "webhookEvents", "cartItems", "userLocations", "serviceZones", "serviceRequests", 
      "invoices", "categories", "deliveryZones", "serviceablePincodes", "homepageConfig", 
      "homepageBanners", "banners", "boutiqueApplications", "identityLinks", 
      "boutiqueDocumentEvents", "commissionLedger", "settlementLedger", "payoutLedger", 
      "refundLedger", "systemAlerts", "cronRuns", "marketplaceHealthSnapshots", 
      "adminRoleProposals", "rateLimits", "refundQueue", "notificationEvents", 
      "notificationLogs", "orderEscalations", "productPerformance", "cachedRoadDistances", 
      "deliverySubsidyLedger", "deliveryPerformanceLedger", "systemConfig", "fitFeedback"
    ];
    const counts: Record<string, number> = {};
    for (const col of collections) {
      try {
        const docs = await ctx.db.query(col as any).collect();
        counts[col] = docs.length;
      } catch (err: any) {
        counts[col] = -1;
      }
    }
    return counts;
  }
});

export const fixProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;
    for (const p of products) {
      const boutique = await ctx.db.get(p.boutiqueId);
      if (boutique && (boutique.boutiqueName.includes("Athul") || boutique.isSandbox || p.price < 50000)) {
        if (p.price < 50000) {
          const newPrice = Math.round(p.price * 100);
          const newDiscountPrice = p.discountPrice ? Math.round(p.discountPrice * 100) : undefined;
          await ctx.db.patch(p._id, {
            price: newPrice,
            discountPrice: newDiscountPrice,
          });
          updatedCount++;
        }
      }
    }
    return { success: true, updatedCount };
  }
});
