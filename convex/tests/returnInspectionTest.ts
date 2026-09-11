import {
  canSellerDecide,
  canAdminAccept,
  canAdminResolveRejection,
  settlementFlowFor,
} from "../lib/returnInspection";
import { recordRoutePayoutInLedger, cancelAccrualForReversal } from "../lib/routeLedger";
import { resolvePayoutHoldDecision, resolveLateTransferHoldUntil } from "../lib/payoutHold";

/**
 * Regression tests for inspected returns and the Route-backed ledger.
 *
 * What these guard against:
 *  - a returned item refunding the customer the moment Porter dropped it off,
 *    before anyone had looked at it;
 *  - a seller paid twice for one order — once by Razorpay Route, then again by
 *    the settlement ledger, which never learned Route had already paid;
 *  - a seller left looking owed for goods they have back, because a reversed
 *    transfer never cancelled the ledger accrual;
 *  - a reversed transfer being released or re-sent by a later delivery event.
 */

type Doc = Record<string, any>;

/** Enough of ctx.db for the ledger helpers: get, insert, patch, one index. */
function makeCtx(seed: Record<string, Doc[]>) {
  const tables: Record<string, Doc[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
  let nextId = 1;

  const find = (id: string): Doc | null => {
    for (const rows of Object.values(tables)) {
      const hit = rows.find((r) => r._id === id);
      if (hit) return hit;
    }
    return null;
  };

  return {
    tables,
    db: {
      get: async (id: string) => find(id),
      insert: async (table: string, doc: Doc) => {
        const _id = `${table}_${nextId++}`;
        (tables[table] ??= []).push({ _id, ...doc });
        return _id;
      },
      patch: async (id: string, patch: Doc) => {
        const doc = find(id);
        if (!doc) throw new Error(`patch on missing doc ${id}`);
        Object.assign(doc, patch);
      },
      query: (table: string) => {
        let rows = [...(tables[table] ?? [])];
        const api: any = {
          withIndex(_name: string, fn: (q: any) => any) {
            const captured: Record<string, unknown> = {};
            const q = {
              eq(field: string, value: unknown) {
                captured[field] = value;
                return q;
              },
            };
            fn(q);
            rows = rows.filter((r) => Object.entries(captured).every(([f, v]) => r[f] === v));
            return api;
          },
          collect: async () => rows,
          first: async () => rows[0] ?? null,
        };
        return api;
      },
    },
  };
}

function seed(overrides: { order?: Doc; accrual?: Doc | null } = {}) {
  const order: Doc = {
    _id: "order_1",
    orderNumber: "HIVE-TL358V-2365",
    boutiqueId: "boutique_1",
    razorpayTransferId: "trf_TZqoYYsxZrLRil",
    transferStatus: "processed",
    ...overrides.order,
  };
  const accrual =
    overrides.accrual === null
      ? []
      : [
          {
            _id: "settlementLedger_accrual",
            boutiqueId: "boutique_1",
            orderId: "order_1",
            type: "accrual",
            source: "order",
            amount: 83535,
            status: "pending",
            accruedAt: 1,
            createdAt: 1,
            ...overrides.accrual,
          },
        ];
  return makeCtx({
    orders: [order],
    boutiques: [
      { _id: "boutique_1", boutiqueName: "VelvetVine Boutique", razorpayAccountId: "acc_TMmwF9tCFoHAPR" },
    ],
    settlementLedger: accrual,
    payoutLedger: [],
  });
}

export async function runReturnInspectionTests() {
  let passed = 0;
  let failed = 0;

  function check(name: string, actual: unknown, expected: unknown) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
      passed++;
      console.log(`[PASS] ${name}`);
    } else {
      failed++;
      console.error(`[FAIL] ${name}\n         expected ${e}\n         got      ${a}`);
    }
  }

  // ── Who can decide a returned item ───────────────────────────────────────
  check("Seller cannot decide before the item arrives", canSellerDecide({ returnStatus: "in_transit" }).ok, false);
  check("Seller can decide once the item is back", canSellerDecide({ returnStatus: "delivered" }).ok, true);
  check(
    "Seller decides only once — after accepting",
    canSellerDecide({ returnStatus: "delivered", returnInspection: { decision: "accepted", byRole: "seller", at: 1 } }).ok,
    false
  );
  check(
    "Seller decides only once — after rejecting",
    canSellerDecide({ returnStatus: "delivered", returnInspection: { decision: "rejected", byRole: "seller", at: 1 } }).ok,
    false
  );
  check("A settled return cannot be decided again", canSellerDecide({ returnStatus: "completed" }).ok, false);

  check("Admin can accept a fresh return", canAdminAccept({ returnStatus: "delivered" }).ok, true);
  check(
    "Admin can accept a return the seller rejected",
    canAdminAccept({ returnStatus: "delivered", returnInspection: { decision: "rejected", byRole: "seller", at: 1 } }).ok,
    true
  );
  check(
    "Admin cannot accept twice",
    canAdminAccept({ returnStatus: "delivered", returnInspection: { decision: "accepted", byRole: "admin", at: 1 } }).ok,
    false
  );
  check(
    "Admin cannot accept a rejection already decided",
    canAdminAccept({
      returnStatus: "delivered",
      returnInspection: { decision: "rejected", byRole: "seller", at: 1, resolution: "no_refund" },
    }).ok,
    false
  );
  check("Admin cannot accept before the item arrives", canAdminAccept({ returnStatus: "picked_up" }).ok, false);

  check("Only a rejection waits on admin", canAdminResolveRejection({ returnStatus: "delivered" }).ok, false);
  check(
    "An undecided rejection waits on admin",
    canAdminResolveRejection({
      returnStatus: "delivered",
      returnInspection: { decision: "rejected", byRole: "seller", at: 1 },
    }).ok,
    true
  );
  check(
    "A rejection is decided only once",
    canAdminResolveRejection({
      returnStatus: "delivered",
      returnInspection: { decision: "rejected", byRole: "seller", at: 1, resolution: "refunded" },
    }).ok,
    false
  );

  // ── What accepting pays out ──────────────────────────────────────────────
  check("A plain return refunds cash", settlementFlowFor(null), "refund");
  check("An accepted exchange issues credit instead", settlementFlowFor({ status: "accepted" }), "coupon");
  check("A completed exchange pays nothing more", settlementFlowFor({ status: "completed" }), "none");
  check("A refused exchange falls back to a refund", settlementFlowFor({ status: "rejected" }), "refund");

  // ── Route payout closes the ledger accrual ───────────────────────────────
  {
    const ctx = seed();
    const result = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1788990982000);
    check("A Route release is recorded", result, { changed: true, reason: "recorded" });

    const payout = ctx.tables.payoutLedger![0]!;
    check("One payout record is written", ctx.tables.payoutLedger!.length, 1);
    check("It carries the seller's share", payout.amount, 83535);
    check("It is marked paid", payout.status, "success");
    check("Its reference is the real transfer id, not a made-up UTR", payout.utrReference, "trf_TZqoYYsxZrLRil");
    check("It names the linked account Route paid", payout.bankAccount.accountNo, "acc_TMmwF9tCFoHAPR");

    const accrual = ctx.tables.settlementLedger![0]!;
    check("The accrual is linked to that payout", accrual.payoutId, payout._id);
    check("The accrual is settled at the release time", accrual.settledAt, 1788990982000);

    // What the wallet sees: nothing left owed, nothing left pending.
    const owed = ctx.tables.settlementLedger!
      .filter((s) => s.status === "available" && s.payoutId === undefined)
      .reduce((a, s) => a + s.amount, 0);
    const pending = ctx.tables.settlementLedger!
      .filter((s) => s.status === "pending")
      .reduce((a, s) => a + s.amount, 0);
    check("Nothing remains payable — no second payout is possible", owed, 0);
    check("Nothing remains pending", pending, 0);

    const again = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1788990982000);
    check("Recording twice changes nothing", again, { changed: false, reason: "already_recorded" });
    check("Still exactly one payout record", ctx.tables.payoutLedger!.length, 1);
  }

  {
    const ctx = seed({ order: { razorpayTransferId: undefined } });
    const result = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1);
    check("No Route transfer, nothing recorded", result.reason, "no_route_transfer");
  }
  {
    const ctx = seed({ accrual: null });
    const result = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1);
    check("No accrual, nothing recorded", result.reason, "no_accrual");
  }
  {
    const ctx = seed({ order: { transferStatus: "reversed" } });
    const result = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1);
    check("A reversed transfer is never recorded as paid", result.reason, "transfer_reversed");
    check("And writes no payout", ctx.tables.payoutLedger!.length, 0);
  }

  // ── A reversal cancels the accrual ───────────────────────────────────────
  {
    const ctx = seed();
    const result = await cancelAccrualForReversal(ctx, "order_1" as any);
    check("A reversal before payout cancels the accrual", result, { changed: true, reason: "cancelled" });
    const deduction = ctx.tables.settlementLedger!.find((s) => s.type === "refund_deduction")!;
    check("The cancellation is the full negative amount", deduction.amount, -83535);
    check("It lands in the same pending bucket", deduction.status, "pending");
    const pendingNet = ctx.tables.settlementLedger!
      .filter((s) => s.status === "pending")
      .reduce((a, s) => a + s.amount, 0);
    check("Pending nets to zero — the seller is not left owed", pendingNet, 0);

    const again = await cancelAccrualForReversal(ctx, "order_1" as any);
    check("Cancelling twice changes nothing", again.reason, "already_cancelled");

    const afterCancel = await recordRoutePayoutInLedger(ctx, "order_1" as any, 1);
    check("A cancelled accrual can never be recorded as paid", afterCancel.reason, "accrual_cancelled");
  }
  {
    const ctx = seed({ accrual: { status: "available", payoutId: "payoutLedger_existing" } });
    await cancelAccrualForReversal(ctx, "order_1" as any);
    const deduction = ctx.tables.settlementLedger!.find((s) => s.type === "refund_deduction")!;
    check("A reversal after payout is owed back straight away", deduction.status, "available");
  }

  // ── A reversed transfer is never released or re-sent ─────────────────────
  check(
    "A reversed transfer is not released by a later delivery event",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "not_eligible",
        razorpayTransferId: "trf_x",
        transferStatus: "reversed",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: true,
      },
      1
    ).action,
    "skip"
  );
  check(
    "Nor is a fresh transfer created for it",
    resolvePayoutHoldDecision(
      { status: "delivered", paymentStatus: "paid", payoutStatus: "not_eligible", transferStatus: "reversed" },
      1
    ).action,
    "skip"
  );

  // ── Only sellers who accept returns hold money back ─────────────────────
  const deliveredAt = Date.UTC(2026, 8, 9, 7, 56, 22);
  const DAY = 24 * 3600 * 1000;

  check(
    "Final Sale, late transfer: paid at once, never held",
    resolveLateTransferHoldUntil({ returnsAccepted: false, deliveredAt }, deliveredAt + 60_000),
    null
  );
  check(
    "Returns accepted, late transfer: held until delivery + 24h",
    resolveLateTransferHoldUntil({ returnsAccepted: true, deliveredAt }, deliveredAt + 60_000),
    deliveredAt + DAY
  );
  check(
    "No policy recorded is treated as returns accepted",
    resolveLateTransferHoldUntil({ deliveredAt }, deliveredAt),
    deliveredAt + DAY
  );
  check(
    "A window already closed pays at once",
    resolveLateTransferHoldUntil({ returnsAccepted: true, deliveredAt }, deliveredAt + DAY + 3600_000),
    null
  );
  check(
    "A window closing inside a minute pays at once, not a hold Razorpay would refuse",
    resolveLateTransferHoldUntil({ returnsAccepted: true, deliveredAt }, deliveredAt + DAY - 30_000),
    null
  );
  check(
    "Final Sale, held at payment: released the moment it is delivered",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        razorpayTransferId: "trf_x",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: false,
      },
      deliveredAt
    ).action,
    "release"
  );
  check(
    "Returns accepted, held at payment: held until delivery + 24h",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        razorpayTransferId: "trf_x",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: true,
      },
      deliveredAt
    ),
    { action: "hold_until", onHoldUntil: deliveredAt + DAY, reason: "return_window_open" }
  );

  console.log(`\nReturn inspection and ledger: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1]?.includes("returnInspectionTest")
) {
  runReturnInspectionTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
