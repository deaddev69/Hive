// convex/lib/routeLedger.ts
// Keeping the settlement ledger in step with what Razorpay Route actually did.
//
// Hive pays sellers through Route: a held transfer at payment, released 24h
// after delivery if nothing comes back. The settlement ledger was written as if
// payouts were a separate manual step — every delivered order got an accrual
// that stayed "pending", then turned "available" a week later, where the admin
// Pay button would pay it out again. A Route payout and a ledger payout for the
// same order, and nothing connecting the two.
//
// These helpers make the ledger a record of Route rather than a rival to it:
// when Route releases a seller's money the accrual is closed against a payout
// entry carrying the transfer id, and when a transfer is reversed — a return
// or an exchange took the money back — the accrual is cancelled so nothing is
// left looking owed.
//
// Plain functions, not mutations, because every caller is already inside one.

import { Id } from "../_generated/dataModel";

async function ledgerRowsForOrder(ctx: any, orderId: Id<"orders">) {
  const rows: any[] = await ctx.db
    .query("settlementLedger")
    .withIndex("by_orderId", (q: any) => q.eq("orderId", orderId))
    .collect();
  return {
    rows,
    accrual: rows.find((r) => r.type === "accrual") ?? null,
  };
}

export type LedgerSyncResult = { changed: boolean; reason: string };

/**
 * Route has released this order's seller payout: close the accrual against a
 * payout record, so the seller's wallet shows it as paid and the manual payout
 * path can never pick it up again.
 *
 * Idempotent — a second call finds the accrual already linked and stops.
 */
export async function recordRoutePayoutInLedger(
  ctx: any,
  orderId: Id<"orders">,
  paidAt: number
): Promise<LedgerSyncResult> {
  const order = await ctx.db.get(orderId);
  if (!order) return { changed: false, reason: "order_not_found" };
  if (!order.razorpayTransferId) return { changed: false, reason: "no_route_transfer" };
  if (order.transferStatus === "reversed") return { changed: false, reason: "transfer_reversed" };

  const { rows, accrual } = await ledgerRowsForOrder(ctx, orderId);
  // No accrual means the order never reached financial delivery — nothing is
  // owed on the ledger, so there is nothing to close.
  if (!accrual) return { changed: false, reason: "no_accrual" };
  if (accrual.payoutId) return { changed: false, reason: "already_recorded" };
  if (rows.some((r) => r.type === "refund_deduction")) {
    return { changed: false, reason: "accrual_cancelled" };
  }

  const boutique = await ctx.db.get(order.boutiqueId);
  const now = Date.now();

  const payoutId = await ctx.db.insert("payoutLedger", {
    payoutNumber: `ROUTE-${order.razorpayTransferId}`,
    boutiqueId: order.boutiqueId,
    amount: accrual.amount,
    status: "success",
    // Route pays the seller's linked Razorpay account, not a bank account Hive
    // holds. The linked account id is recorded where the bank details would be.
    bankAccount: {
      holderName: boutique?.boutiqueName ?? "Boutique",
      accountNo: boutique?.razorpayAccountId ?? "razorpay-route",
      ifsc: "RAZORPAY-ROUTE",
    },
    utrReference: order.razorpayTransferId,
    payoutSnapshot: {
      availableBalance: accrual.amount,
      orderCount: 1,
      settlementIds: [accrual._id],
      generatedAt: paidAt,
    },
    paidAt,
    createdAt: now,
  });

  await ctx.db.patch(accrual._id, {
    status: "available",
    settledAt: paidAt,
    payoutId,
  });

  return { changed: true, reason: "recorded" };
}

/**
 * The seller's transfer was reversed — the customer was refunded or given
 * credit, and the money went back. Cancel the accrual so the seller is not
 * left looking owed for goods they have back.
 *
 * The cancelling entry lands in the same bucket as the accrual it offsets, so a
 * still-pending accrual nets to zero while pending rather than leaving one
 * bucket positive and another negative. When the payout had already gone out,
 * the entry is immediately available: the seller owes it back.
 */
export async function cancelAccrualForReversal(
  ctx: any,
  orderId: Id<"orders">
): Promise<LedgerSyncResult> {
  const { rows, accrual } = await ledgerRowsForOrder(ctx, orderId);
  if (!accrual) return { changed: false, reason: "no_accrual" };
  if (rows.some((r) => r.type === "refund_deduction" && r.source === "system")) {
    return { changed: false, reason: "already_cancelled" };
  }

  const now = Date.now();
  const status = accrual.payoutId ? "available" : accrual.status;

  await ctx.db.insert("settlementLedger", {
    boutiqueId: accrual.boutiqueId,
    orderId,
    type: "refund_deduction",
    source: "system",
    amount: -Math.abs(accrual.amount),
    status,
    accruedAt: now,
    createdAt: now,
    ...(status === "available" ? { settledAt: now } : {}),
  });

  return { changed: true, reason: "cancelled" };
}
