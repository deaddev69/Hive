import { enqueueCancellationRefund, refundCancelledOrder } from "../lib/refunds";

/**
 * Regression tests for refunds on cancellation.
 *
 * The bug these guard against: every cancellation path wrote a status flag and
 * stopped. Seller-decline and the SLA sweeps set `refundStatus: "pending"`,
 * which nothing read; admin cancel set nothing at all. Forty paid orders sat
 * cancelled and unrefunded for two months, and the helper built for exactly
 * this job had no callers.
 *
 * The tests drive the real helper against a small in-memory stand-in for the
 * Convex database, so the decisions — who gets refunded, how much, and how many
 * times — are checked rather than assumed.
 */

type Doc = Record<string, any>;

/** Enough of ctx.db for the helper: get, insert, patch, and two indexes. */
function makeCtx(seed: { orders: Doc[]; payments: Doc[]; refundQueue?: Doc[] }) {
  const tables: Record<string, Doc[]> = {
    orders: seed.orders.map((d) => ({ ...d })),
    payments: seed.payments.map((d) => ({ ...d })),
    refundQueue: (seed.refundQueue ?? []).map((d) => ({ ...d })),
  };
  let nextId = 1;

  function find(id: string): Doc | null {
    for (const rows of Object.values(tables)) {
      const hit = rows.find((r) => r._id === id);
      if (hit) return hit;
    }
    return null;
  }

  function query(table: string) {
    let rows = [...(tables[table] ?? [])];
    const api: any = {
      withIndex(_name: string, fn: (q: any) => any) {
        const captured: Record<string, unknown> = {};
        fn({
          eq(field: string, value: unknown) {
            captured[field] = value;
            return this;
          },
        });
        rows = rows.filter((r) =>
          Object.entries(captured).every(([f, v]) => r[f] === v)
        );
        return api;
      },
      order() {
        return api;
      },
      take(n: number) {
        return Promise.resolve(rows.slice(0, n));
      },
      collect() {
        return Promise.resolve(rows);
      },
      first() {
        return Promise.resolve(rows[0] ?? null);
      },
    };
    return api;
  }

  return {
    tables,
    db: {
      get: async (id: string) => find(id),
      insert: async (table: string, doc: Doc) => {
        const _id = `${table}_${nextId++}`;
        tables[table]!.push({ _id, ...doc });
        return _id;
      },
      patch: async (id: string, patch: Doc) => {
        const doc = find(id);
        if (!doc) throw new Error(`patch on missing doc ${id}`);
        Object.assign(doc, patch);
      },
      query,
    },
  };
}

function paidOrder(overrides: Doc = {}): Doc {
  return {
    _id: "order_1",
    orderNumber: "HIVE-TEST-0001",
    total: 100721,
    paymentStatus: "paid",
    paymentId: "payment_1",
    razorpayTransferId: "trf_TZQheSOBbinRDD",
    ...overrides,
  };
}

function capturedPayment(overrides: Doc = {}): Doc {
  return {
    _id: "payment_1",
    orderId: "order_1",
    status: "captured",
    amount: 100721,
    createdAt: 1000,
    ...overrides,
  };
}

export async function runCancellationRefundTests() {
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

  // ── A cancelled paid order is refunded in full ───────────────────────────
  {
    const ctx = makeCtx({ orders: [paidOrder()], payments: [capturedPayment()] });
    const result = await refundCancelledOrder(ctx, {
      orderId: "order_1" as any,
      reason: "Boutique declined order HIVE-TEST-0001",
      idempotencySuffix: "boutique_declined",
    });

    check("A cancelled paid order queues a refund", result.enqueued, true);
    check("Exactly one refund job is created", ctx.tables.refundQueue!.length, 1);

    const job = ctx.tables.refundQueue![0]!;
    check("The full order total is refunded", job.amountPaise, 100721);
    check("The refund points at the captured payment", job.paymentId, "payment_1");
    check("The refund points back at the order", job.orderId, "order_1");
    check("The job starts pending for the drain cron", job.status, "pending");
    check(
      "The idempotency key names the cause",
      job.idempotencyKey,
      "cancel_refund_order_1_boutique_declined"
    );

    const order = ctx.tables.orders![0]!;
    check("The order records a pending refund", order.refundStatus, "pending");
    check("The seller stops being payout-eligible", order.payoutStatus, "not_eligible");
    check("The hold reason names the cancellation", order.payoutHoldReason, "order_cancelled");
    check(
      "paymentStatus is NOT claimed as refunded before Razorpay confirms",
      order.paymentStatus,
      "paid"
    );
  }

  // ── Cancelling twice must not refund twice ───────────────────────────────
  {
    const ctx = makeCtx({ orders: [paidOrder()], payments: [capturedPayment()] });
    const args = {
      orderId: "order_1" as any,
      reason: "Boutique declined order HIVE-TEST-0001",
      idempotencySuffix: "boutique_declined",
    };
    await refundCancelledOrder(ctx, args);
    const second = await refundCancelledOrder(ctx, args);

    check("A repeated cancel reports the same refund", second.enqueued, true);
    check("A repeated cancel creates no second job", ctx.tables.refundQueue!.length, 1);
  }

  // ── Two different cancel causes on one order still refund once ───────────
  {
    const ctx = makeCtx({ orders: [paidOrder()], payments: [capturedPayment()] });
    await refundCancelledOrder(ctx, {
      orderId: "order_1" as any,
      reason: "SLA sweep",
      idempotencySuffix: "sla_sweep",
    });
    const viaAdmin = await refundCancelledOrder(ctx, {
      orderId: "order_1" as any,
      reason: "Admin cancel",
      idempotencySuffix: "admin_cancel",
    });

    check(
      "A second cause is refused because money is already on its way",
      viaAdmin.enqueued,
      false
    );
    check(
      "It says why rather than failing silently",
      (viaAdmin as any).reason,
      "refund_already_pending"
    );
    check("Still exactly one refund job", ctx.tables.refundQueue!.length, 1);
  }

  // ── A return already refunding this order blocks a cancel refund ─────────
  {
    const ctx = makeCtx({
      orders: [paidOrder()],
      payments: [capturedPayment()],
      refundQueue: [
        {
          _id: "refundQueue_pre",
          orderId: "order_1",
          paymentId: "payment_1",
          amountPaise: 100721,
          status: "completed",
          idempotencyKey: "return_refund_order_1",
        },
      ],
    });
    const result = await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Admin cancel",
      idempotencySuffix: "admin_cancel",
    });

    check("An already-completed refund is not repeated", result.enqueued, false);
    check(
      "It reports the existing refund",
      (result as any).reason,
      "refund_already_completed"
    );
    check("No second job is queued", ctx.tables.refundQueue!.length, 1);
  }

  // ── Unpaid orders are a no-op, not an error ──────────────────────────────
  for (const status of ["pending", "failed"]) {
    const ctx = makeCtx({
      orders: [paidOrder({ paymentStatus: status, paymentId: undefined })],
      payments: [],
    });
    const result = await refundCancelledOrder(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check(`Cancelling a ${status} order queues nothing`, result.enqueued, false);
    check(`No job for a ${status} order`, ctx.tables.refundQueue!.length, 0);
    check(
      `A ${status} order is left alone`,
      ctx.tables.orders![0]!.refundStatus ?? null,
      null
    );
  }

  // ── An order already refunded is not refunded again ──────────────────────
  {
    const ctx = makeCtx({
      orders: [paidOrder({ paymentStatus: "refunded" })],
      payments: [capturedPayment({ status: "refunded" })],
    });
    const result = await refundCancelledOrder(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check("An already-refunded order queues nothing", result.enqueued, false);
    check("No job for an already-refunded order", ctx.tables.refundQueue!.length, 0);
  }

  // ── The payment is found without the order's pointer ─────────────────────
  {
    const ctx = makeCtx({
      orders: [paidOrder({ paymentId: undefined })],
      payments: [capturedPayment()],
    });
    const result = await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check("A legacy order still finds its payment by index", result.enqueued, true);
    check("And refunds the right amount", (result as any).amountPaise, 100721);
  }

  // ── The newest captured payment wins when a retry made several ───────────
  {
    const ctx = makeCtx({
      orders: [paidOrder({ paymentId: undefined })],
      payments: [
        capturedPayment({ _id: "payment_old", status: "failed", createdAt: 1000 }),
        capturedPayment({ _id: "payment_new", createdAt: 5000 }),
      ],
    });
    await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check(
      "The captured payment is refunded, not the failed attempt",
      ctx.tables.refundQueue![0]!.paymentId,
      "payment_new"
    );
  }

  // ── A paid order with no payment record is flagged, not crashed ──────────
  {
    const ctx = makeCtx({
      orders: [paidOrder({ paymentId: undefined })],
      payments: [],
    });
    const result = await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check("A paid order with no payment reports the gap", result.enqueued, false);
    check("And names it", (result as any).reason, "no_payment_record");
  }

  // ── A zero-total order queues nothing ────────────────────────────────────
  {
    const ctx = makeCtx({
      orders: [paidOrder({ total: 0 })],
      payments: [capturedPayment({ amount: 0 })],
    });
    const result = await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check("A fully coupon-funded order queues no cash refund", result.enqueued, false);
    check("And says why", (result as any).reason, "zero_amount");
  }

  // ── An order with a held transfer still refunds ──────────────────────────
  // reverse_all in the drain cron unwinds the seller's share; the queue entry
  // itself is identical either way.
  {
    const ctx = makeCtx({
      orders: [paidOrder({ razorpayTransferId: undefined })],
      payments: [capturedPayment()],
    });
    const noTransfer = await enqueueCancellationRefund(ctx, {
      orderId: "order_1" as any,
      reason: "Cancelled",
      idempotencySuffix: "admin_cancel",
    });
    check("An order with no transfer refunds the same way", noTransfer.enqueued, true);
  }

  console.log(`\nCancellation refunds: ${passed} passed, ${failed} failed.`);
  return { passed, failed };
}

// Run immediately if executed via tsx, matching convex/tests/signatureTest.ts.
if (
  typeof process !== "undefined" &&
  process.argv &&
  process.argv[1]?.includes("cancellationRefundTest")
) {
  runCancellationRefundTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
  });
}
