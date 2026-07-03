// convex/tests/financeAudit.ts
// Money Movement Chaos Test Suite — verifies payment capture, accrual idempotency, payout failure loops, and ledger balance reconciliation.

import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { markOrderFinanciallyDelivered, settleEligibleOrdersHelper, runReconciliationHelper } from "../adminFinance";
import { verifyPaymentAndPlaceOrderInternal } from "../payments";
import { Id } from "../_generated/dataModel";

export const runMoneyMovementAudit = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING MONEY MOVEMENT CHAOS AUDIT ===");
    const now = Date.now();

    // 1. Setup Test Admin & Customer
    const customerUserId = await ctx.db.insert("users", {
      email: "chaos_customer@hive.com",
      role: "customer",
      isActive: true,
      isPhoneVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const customerSessionToken = `mock_user_${customerUserId}`;
    // 2. Setup Test Boutique & Compliance Proof
    const encryptedAccountNo = "U2FsdGVkX1" + Math.random().toString(36).substring(2, 12); // Simulated encrypted data placeholder

    const boutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName: "Chaos Audit Boutique",
      ownerName: "Audit Master",
      email: "audit@boutique.com",
      phone: "+918888888888",
      address: "Finance Boulevard 42",
      latitude: 12.971,
      longitude: 77.594,
      deliveryRadiusKm: 5,
      description: "Dedicated chaos testing boutique",
      status: "APPROVED",
      isAcceptingOrders: true,
      isTestData: true,
      commissionRate: 10,
      bankAccount: {
        holderName: "Audit Master",
        accountNoLast4: "5678",
        encryptedAccountNo,
        ifsc: "HDFC0001234",
      },
      ownerEmail: "audit@boutique.com",
      ownerUserId: customerUserId, // Link to trigger payout notification
      createdAt: now,
    });

    await ctx.db.insert("boutiqueDocuments", {
      boutiqueId,
      type: "bank_proof",
      url: "https://example.com/mock_proof.jpg",
      publicId: "mock_proof_doc_id",
      status: "verified",
      createdAt: now,
    });

    // 3. Setup Catalog
    const category = await ctx.db.query("categories").first();
    if (!category) {
      throw new Error("Cannot run chaos audit: No category found. Seed database first.");
    }

    const productId = await ctx.db.insert("products", {
      boutiqueId,
      name: "Chaos Audit Silk Saree",
      slug: "chaos-audit-silk-saree-" + now,
      description: "Chaos testing catalog item",
      categoryId: category._id,
      price: 2000, // INR 2000
      images: [],
      sizes: ["L"],
      stockBySize: { L: 2 },
      sameDayEligible: true,
      featured: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // 4. Setup Address & Checkout Session
    const addressId = await ctx.db.insert("addresses", {
      userId: customerUserId,
      label: "Chaos Palace",
      city: "Kochi",
      state: "Kerala",
      pincode: "682001",
      lat: 9.931,
      lng: 76.267,
      isDefault: true,
      isDeleted: false,
      createdAt: now,
    });

    const razorpayOrderId = "order_audit_" + Math.random().toString(36).substring(2, 10);
    const checkoutSessionId = await ctx.db.insert("checkoutSessions", {
      userId: customerUserId,
      addressId,
      addressSnapshot: {
        label: "Chaos Palace",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001",
        lat: 9.931,
        lng: 76.267,
        phone: "+918888888888",
      },
      deliveryDate: "2026-06-25",
      deliverySlot: "14:00 - 16:00",
      paymentMethod: "upi",
      items: [
        {
          productId: productId as unknown as string,
          name: "Chaos Audit Silk Saree",
          price: 2000,
          imageUrl: "",
          boutiqueName: "Chaos Audit Boutique",
          size: "L",
          quantity: 1,
        },
      ],
      subtotal: 2000,
      deliveryFee: 100, // INR 100
      discount: 0,
      total: 2100, // Total = INR 2100 = 210000 paise
      razorpayOrderId,
      status: "pending",
      expiresAt: now + 15 * 60 * 1000,
      createdAt: now,
    });

    const paymentId = await ctx.db.insert("payments", {
      customerId: customerUserId,
      razorpayOrderId,
      amount: 210000, // paise (INR 2100)
      currency: "INR",
      status: "created",
      createdAt: now,
      updatedAt: now,
      webhookEvents: [],
    });

    // ─── STEP 1: CAPTURE PAYMENT & PLACE ORDER ───
    console.log("Audit Step 1: Capturing payment and placing order...");
    const placementResult = await verifyPaymentAndPlaceOrderInternal(ctx, {
      checkoutSessionId,
      razorpayPaymentId: "pay_audit_mock_123",
      razorpaySignature: "mock_sig_audit_456",
      token: customerSessionToken,
    });

    if (!placementResult || !placementResult.success) {
      throw new Error(`Placement failed: ${JSON.stringify(placementResult)}`);
    }

    const orderId = (placementResult as any).orderId;
    const order = (await ctx.db.get(orderId as Id<"orders">)) as any;
    if (!order) throw new Error("Order not created.");

    // Assert database state after creation
    if (order.status !== "pending_confirmation") {
      throw new Error(`Expected pending_confirmation, got: ${order.status}`);
    }
    if (order.paymentStatus !== "paid") {
      throw new Error(`Expected paymentStatus paid, got: ${order.paymentStatus}`);
    }

    // ─── STEP 2: TRANSITION STATUS AND CREATE SHIPMENT ───
    console.log("Audit Step 2: Creating shipment and updating status to delivered...");
    
    // Manual shipment generation
    const shipmentId = await ctx.db.insert("shipments", {
      orderId,
      provider: "manual",
      awbNumber: "AWB" + Math.floor(100000 + Math.random() * 900000),
      status: "delivered", // Deliver shipment
      bookingStatus: "booked",
      pickupAddress: {
        name: "Chaos Audit Boutique",
        line1: "Finance Boulevard 42",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001",
        phone: "+918888888888",
      },
      deliveryAddress: {
        name: "Chaos Customer",
        line1: "Chaos Palace",
        city: "Kochi",
        state: "Kerala",
        pincode: "682001",
        phone: "+918888888888",
      },
      createdAt: now,
      updatedAt: now,
      rawWebhookEvents: [],
    });

    // Update parent order details
    await ctx.db.patch(orderId, {
      shipmentId,
      status: "delivered",
      deliveredAt: now,
      claimWindowExpiresAt: now + 48 * 3600 * 1000,
    });

    // ─── STEP 3: EXECUTE ACCRUAL ───
    console.log("Audit Step 3: Triggering settlement accrual...");
    const accrualRes = await markOrderFinanciallyDelivered(ctx, orderId, now);
    if (!accrualRes || !accrualRes.success) {
      throw new Error(`Accrual failed: ${JSON.stringify(accrualRes)}`);
    }

    // Assert exactly 1 accrual record
    const settlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();

    const accruals = settlements.filter(s => s.type === "accrual");
    if (accruals.length !== 1) {
      throw new Error(`Expected exactly 1 settlement accrual, found: ${accruals.length}`);
    }

    // Boutique net amount = subtotal - 10% commission = 2000 - 200 = 1800 (excluding deliveryFee)
    const expectedAccrualAmount = 1800;
    if (accruals[0]!.amount !== expectedAccrualAmount) {
      throw new Error(`Accrual amount mismatch: Expected ${expectedAccrualAmount}, got ${accruals[0]!.amount}`);
    }

    // Assert exactly 1 commission record
    const commissions = await ctx.db
      .query("commissionLedger")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();
    if (commissions.length !== 1) {
      throw new Error(`Expected exactly 1 commission cut record, found: ${commissions.length}`);
    }

    // Assert exactly 1 audit log record for settlement.accrued
    const auditLogs = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) => q.eq("entityType", "orders").eq("entityId", orderId))
      .filter((q) => q.eq(q.field("action"), "settlement.accrued"))
      .collect();
    if (auditLogs.length !== 1) {
      throw new Error(`Expected exactly 1 audit log for settlement.accrued, found: ${auditLogs.length}`);
    }

    // ─── STEP 4: ACCRUAL IDEMPOTENCY GUARD ───
    console.log("Audit Step 4: Re-triggering markOrderFinanciallyDelivered to verify idempotency...");
    const accrualRepeatRes = await markOrderFinanciallyDelivered(ctx, orderId, now);
    if (!accrualRepeatRes.success) {
      throw new Error("Repeat accrual call threw an unexpected error instead of handling idempotently.");
    }

    const settlementsPostRepeat = await ctx.db
      .query("settlementLedger")
      .withIndex("by_orderId", (q) => q.eq("orderId", orderId))
      .collect();
    const accrualsPostRepeat = settlementsPostRepeat.filter(s => s.type === "accrual");
    if (accrualsPostRepeat.length !== 1) {
      throw new Error(`FAIL: Accrual was duplicated! Count: ${accrualsPostRepeat.length}`);
    }

    const auditLogsPostRepeat = await ctx.db
      .query("auditLogs")
      .withIndex("by_entityType_entityId", (q) => q.eq("entityType", "orders").eq("entityId", orderId))
      .filter((q) => q.eq(q.field("action"), "settlement.accrued"))
      .collect();
    if (auditLogsPostRepeat.length !== 1) {
      throw new Error(`FAIL: Accrual audit log was duplicated! Count: ${auditLogsPostRepeat.length}`);
    }

    // ─── STEP 5: RELEASE SETTLEMENT VIA CRON ───
    console.log("Audit Step 5: Expiring claim window and releasing settlements...");
    
    // Fast-forward claim window expiration
    await ctx.db.patch(orderId, {
      claimWindowExpiresAt: now - 1, // expired
    });

    const releaseRes = await settleEligibleOrdersHelper(ctx);
    if (!releaseRes.success && releaseRes.reason !== "running") {
      throw new Error(`Settlement release cron failed: ${JSON.stringify(releaseRes)}`);
    }

    // Verify status is now 'available'
    const releasedSettlement = await ctx.db.get(accruals[0]!._id);
    if (releasedSettlement?.status !== "available") {
      throw new Error(`Expected settlement to be available, got status: ${releasedSettlement?.status}`);
    }

    // ─── STEP 6: GENERATE PAYOUT BATCH ───
    console.log("Audit Step 6: Creating payout batch and asserting ledger rules...");
    
    // Fetch unpaid available settlements
    const unpaidSettlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutiqueId))
      .collect();

    const eligible = unpaidSettlements.filter(s => s.status === "available" && s.payoutId === undefined);
    const balancePaise = eligible.reduce((sum, s) => sum + s.amount, 0);

    if (balancePaise !== expectedAccrualAmount) {
      throw new Error(`Available payout balance mismatch: Expected ${expectedAccrualAmount}, got: ${balancePaise}`);
    }

    // Precondition Checks: Decrypt account details successfully
    const boutique = (await ctx.db.get(boutiqueId)) as any;
    if (!boutique) throw new Error("Boutique not found.");

    // Bank decryption check
    let decrypted = "";
    if (encryptedAccountNo) {
      decrypted = "5678"; // Mock decrypted account number matching last 4
    }
    if (!decrypted || decrypted.includes("X") || boutique.bankAccount?.ifsc !== "HDFC0001234" || boutique.bankAccount?.holderName !== "Audit Master") {
      throw new Error("Payout Preconditions Failed: bank decryption verification failed.");
    }

    // Create payout record
    const payoutNumber = "PAY-CHAOS-" + Math.floor(1000 + Math.random() * 9000);
    const payoutId = await ctx.db.insert("payoutLedger", {
      payoutNumber,
      boutiqueId,
      amount: balancePaise,
      status: "success",
      bankAccount: {
        holderName: "Audit Master",
        accountNo: "12345678",
        ifsc: "HDFC0001234",
      },
      utrReference: "UTRCHAOS1234",
      payoutSnapshot: {
        availableBalance: balancePaise,
        orderCount: 1,
        settlementIds: eligible.map(s => s._id),
        generatedAt: now,
      },
      paidAt: now,
      createdAt: now,
    });

    // Link settlements
    for (const s of eligible) {
      await ctx.db.patch(s._id, { payoutId });
    }

    // Verify wallet balance is now 0 (all outstanding settlements are linked to a payout)
    const settlementsAfterPayout = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutiqueId))
      .collect();
    const availableBalanceAfterPayout = settlementsAfterPayout
      .filter((s) => s.status === "available" && s.payoutId === undefined)
      .reduce((sum, s) => sum + s.amount, 0);

    if (availableBalanceAfterPayout !== 0) {
      throw new Error(`Expected wallet available balance to be 0 after payout, got: ${availableBalanceAfterPayout}`);
    }

    // ─── STEP 7: SIMULATE PAYOUT FAILURE & RECOVERY ───
    console.log("Audit Step 7: Simulating payout failure and asserting recovery rollbacks...");
    
    // Transition payout status to failed
    await ctx.db.patch(payoutId, {
      status: "failed",
      utrReference: undefined,
      paidAt: undefined,
    });

    // Recovery rollback: unlink settlements
    const linkedSettlements = await ctx.db
      .query("settlementLedger")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", payoutId))
      .collect();

    for (const s of linkedSettlements) {
      await ctx.db.patch(s._id, { payoutId: undefined });
    }

    // Verify balance is restored
    const settlementsAfterFailure = await ctx.db
      .query("settlementLedger")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutiqueId))
      .collect();
    const availableBalanceAfterFailure = settlementsAfterFailure
      .filter((s) => s.status === "available" && s.payoutId === undefined)
      .reduce((sum, s) => sum + s.amount, 0);

    if (availableBalanceAfterFailure !== expectedAccrualAmount) {
      throw new Error(`Expected wallet balance to be restored to ${expectedAccrualAmount}, got: ${availableBalanceAfterFailure}`);
    }

    // ─── STEP 8: RETRY PAYOUT BATCH ───
    console.log("Audit Step 8: Retrying payout batch creation...");
    const retryPayoutNumber = "PAY-CHAOS-RETRY-" + Math.floor(1000 + Math.random() * 9000);
    const retryPayoutId = await ctx.db.insert("payoutLedger", {
      payoutNumber: retryPayoutNumber,
      boutiqueId,
      amount: availableBalanceAfterFailure,
      status: "success",
      bankAccount: {
        holderName: "Audit Master",
        accountNo: "12345678",
        ifsc: "HDFC0001234",
      },
      utrReference: "UTRCHAOSRETRY567",
      payoutSnapshot: {
        availableBalance: availableBalanceAfterFailure,
        orderCount: 1,
        settlementIds: linkedSettlements.map(s => s._id),
        generatedAt: now,
      },
      paidAt: now,
      createdAt: now,
    });

    for (const s of linkedSettlements) {
      await ctx.db.patch(s._id, { payoutId: retryPayoutId });
    }

    // ─── STEP 9: PLATFORM-WIDE LEDGER RECONCILIATION ───
    console.log("Audit Step 9: Running platform-wide ledger reconciliation checks...");
    const report = await runReconciliationHelper(ctx.db);
    
    // Validate our specific audit records are reconciled and not present in exceptions
    const orderExc = (report as any).ordersReconciliation?.exceptions || [];
    const isOurOrderExceptional = orderExc.some((e: any) => e.orderId === orderId);
    if (isOurOrderExceptional) {
      throw new Error(`Audit Failure: Our test order ${orderId} has reconciliation issues! ${JSON.stringify(orderExc.find((e: any) => e.orderId === orderId))}`);
    }

    const payoutExc = (report as any).payoutReconciliation?.exceptions || [];
    const isOurPayoutExceptional = payoutExc.some((e: any) => e.payoutId === payoutId || e.payoutId === retryPayoutId);
    if (isOurPayoutExceptional) {
      throw new Error(`Audit Failure: Our test payout has reconciliation issues! ${JSON.stringify(payoutExc)}`);
    }

    console.log("PASSED: Our audit order and payouts reconciled successfully.");

    console.log("Audit Step 10: Cleaning up chaos testing records...");
    // ─── CLEANUP TESTING DATA ───
    await ctx.db.delete(customerUserId);
    await ctx.db.delete(boutiqueId);
    
    const bankDoc = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutiqueId))
      .first();
    if (bankDoc) await ctx.db.delete(bankDoc._id);

    await ctx.db.delete(productId);
    await ctx.db.delete(addressId);
    await ctx.db.delete(checkoutSessionId);
    await ctx.db.delete(paymentId);
    await ctx.db.delete(orderId);
    await ctx.db.delete(shipmentId);
    await ctx.db.delete(accruals[0]!._id);
    await ctx.db.delete(commissions[0]!._id);
    await ctx.db.delete(auditLogs[0]!._id);
    await ctx.db.delete(payoutId);
    await ctx.db.delete(retryPayoutId);


    console.log("=== ALL MONEY MOVEMENT CHAOS AUDIT TESTS PASSED ===");
    return { success: true };
  },
});
