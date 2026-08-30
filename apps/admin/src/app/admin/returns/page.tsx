"use client";

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { LoadingState } from "@hive/ui";
import {
  Repeat,
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";

type Tab = "exchanges" | "coupons" | "recovery";

function rupees(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

function daysUntil(ms: number): number {
  return Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  used: "bg-slate-100 text-slate-600 border-slate-200",
  expired: "bg-amber-50 text-amber-700 border-amber-200",
  revoked: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${
        STATUS_STYLES[status] || "bg-slate-100 text-slate-600 border-slate-200"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminReturnsAndCoupons() {
  const [tab, setTab] = React.useState<Tab>("exchanges");
  const [search, setSearch] = React.useState("");

  const summary = useQuery(api.coupons.getCouponSummaryAdmin, {});
  const exchanges = useQuery(api.exchanges.listExchangesAdmin, {});
  const coupons = useQuery(api.coupons.listCouponsAdmin, {
    searchCode: search.trim() || undefined,
  });
  const recovery = useQuery(api.coupons.listRecoveryItemsAdmin, {});

  const revokeCoupon = useMutation(api.coupons.revokeCouponAdmin);
  const resolveRecovery = useMutation(api.coupons.resolveRecoveryItemAdmin);
  const initiateReturn = useMutation(api.adminOrders.initiateReturnAdmin);

  const [busy, setBusy] = React.useState<string | null>(null);

  const handleRevoke = async (couponId: Id<"coupons">, code: string) => {
    const destination = window.confirm(
      `Revoking coupon ${code}.\n\nOK = refund the customer their money.\nCancel = release it to the seller instead (only correct if the goods were never actually returned).`
    )
      ? "refund_customer"
      : "release_seller";

    const reason = window.prompt("Why is this coupon being revoked? (recorded in the audit log)");
    if (!reason?.trim()) return;

    setBusy(couponId);
    try {
      await revokeCoupon({ couponId, reason: reason.trim(), destination: destination as any });
      alert(
        destination === "refund_customer"
          ? "Coupon revoked and refund queued to the customer."
          : "Coupon revoked and the payout released to the seller."
      );
    } catch (err: any) {
      alert(err.message || "Failed to revoke coupon.");
    } finally {
      setBusy(null);
    }
  };

  // One Porter leg serves both flows, so an accepted exchange dispatches
  // through the same initiateReturnAdmin mutation a cash return uses.
  const handleDispatch = async (exchangeId: string, orderId: Id<"orders">) => {
    setBusy(exchangeId);
    try {
      await initiateReturn({ orderId });
      alert("Porter dispatched. The rider will collect from the customer and deliver to the boutique.");
    } catch (err: any) {
      alert(err.message || "Failed to dispatch Porter.");
    } finally {
      setBusy(null);
    }
  };

  const handleResolve = async (
    itemId: Id<"ledgerRecoveryItems">,
    status: "recovered" | "written_off"
  ) => {
    const notes = window.prompt(`Notes for marking this ${status.replace("_", " ")}?`) || undefined;
    setBusy(itemId);
    try {
      await resolveRecovery({ itemId, status, notes });
    } catch (err: any) {
      alert(err.message || "Failed to update recovery item.");
    } finally {
      setBusy(null);
    }
  };

  if (summary === undefined) {
    return <LoadingState message="Loading returns and coupons..." variant="full" />;
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div>
        <h1 className="text-3xl font-serif font-black text-slate-900 tracking-tight">
          Returns &amp; Exchanges
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Returns refund cash. Exchanges issue store credit for the same boutique.
        </p>
      </div>

      {/* Liability summary — active coupons are money Hive is holding. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Outstanding credit"
          value={rupees(summary.outstandingLiabilityPaise)}
          sub={`${summary.activeCount} active coupon${summary.activeCount === 1 ? "" : "s"}`}
          tone="amber"
        />
        <SummaryCard
          label="Expiring in 7 days"
          value={String(summary.expiringWithin7Days)}
          sub="auto-refunds on expiry"
          tone="slate"
        />
        <SummaryCard
          label="Redeemed"
          value={String(summary.usedCount)}
          sub={`${summary.expiredCount} expired · ${summary.revokedCount} revoked`}
          tone="slate"
        />
        <SummaryCard
          label="Needs recovery"
          value={rupees(summary.openRecoveryPaise)}
          sub={`${summary.openRecoveryCount} open item${summary.openRecoveryCount === 1 ? "" : "s"}`}
          tone={summary.openRecoveryCount > 0 ? "rose" : "slate"}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {([
          ["exchanges", "Exchanges", Repeat],
          ["coupons", "Coupons", Ticket],
          ["recovery", "Recovery queue", AlertTriangle],
        ] as Array<[Tab, string, any]>).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 -mb-px transition-all cursor-pointer ${
              tab === key
                ? "border-amber-500 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {key === "recovery" && summary.openRecoveryCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px]">
                {summary.openRecoveryCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Exchanges ─────────────────────────────────────────────────────── */}
      {tab === "exchanges" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Order</Th>
                <Th>Boutique</Th>
                <Th>Customer</Th>
                <Th>Value</Th>
                <Th>Status</Th>
                <Th>Requested</Th>
                <Th>Reason</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {(exchanges ?? []).map((ex: any) => (
                <tr key={ex._id} className="border-b border-slate-100 last:border-0">
                  <Td className="font-bold text-slate-900">{ex.orderNumber ?? "—"}</Td>
                  <Td>{ex.boutiqueName}</Td>
                  <Td>{ex.customerName}</Td>
                  <Td className="tabular-nums">{rupees(ex.orderTotalPaise)}</Td>
                  <Td>
                    <StatusPill status={ex.status} />
                  </Td>
                  <Td className="text-slate-500">{shortDate(ex.requestedAt)}</Td>
                  <Td className="max-w-[220px] truncate text-slate-500" title={ex.reason || ""}>
                    {ex.rejectionReason || ex.reason || "—"}
                  </Td>
                  <Td>
                    {ex.status === "accepted" && (
                      <button
                        type="button"
                        disabled={busy === ex._id}
                        onClick={() => handleDispatch(ex._id, ex.orderId)}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                      >
                        Send Porter
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
              {exchanges && exchanges.length === 0 && (
                <EmptyRow colSpan={8} message="No exchange requests yet." />
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Coupons ───────────────────────────────────────────────────────── */}
      {tab === "coupons" && (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <Th>Code</Th>
                  <Th>Value</Th>
                  <Th>Boutique</Th>
                  <Th>Customer</Th>
                  <Th>Status</Th>
                  <Th>Expires</Th>
                  <Th>What happened</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {(coupons ?? []).map((c: any) => (
                  <tr key={c._id} className="border-b border-slate-100 last:border-0">
                    <Td className="font-mono font-bold text-slate-900">{c.code}</Td>
                    <Td className="tabular-nums font-semibold">{rupees(c.amountPaise)}</Td>
                    <Td>{c.boutiqueName}</Td>
                    <Td>{c.customerName}</Td>
                    <Td>
                      <StatusPill status={c.status} />
                    </Td>
                    <Td className="text-slate-500">
                      {shortDate(c.expiresAt)}
                      {c.status === "active" && (
                        <span className="block text-[10px] text-amber-600 font-semibold">
                          {daysUntil(c.expiresAt)}d left
                        </span>
                      )}
                    </Td>
                    <Td className="text-slate-600">
                      {c.redemption ? (
                        <RedemptionSummary redemption={c.redemption} />
                      ) : c.status === "revoked" ? (
                        <span className="text-rose-600">{c.revokedReason || "Revoked"}</span>
                      ) : c.status === "expired" ? (
                        <span>Refunded to customer</span>
                      ) : (
                        <span className="text-slate-400">Not yet used</span>
                      )}
                    </Td>
                    <Td>
                      {c.status === "active" && (
                        <button
                          type="button"
                          disabled={busy === c._id}
                          onClick={() => handleRevoke(c._id, c.code)}
                          className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-all disabled:opacity-60 cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </Td>
                  </tr>
                ))}
                {coupons && coupons.length === 0 && (
                  <EmptyRow colSpan={8} message="No coupons issued yet." />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recovery queue ────────────────────────────────────────────────── */}
      {tab === "recovery" && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <Th>Order</Th>
                <Th>Boutique</Th>
                <Th>Owed</Th>
                <Th>Why</Th>
                <Th>Raised</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {(recovery ?? []).map((item: any) => (
                <tr key={item._id} className="border-b border-slate-100 last:border-0">
                  <Td className="font-bold text-slate-900">{item.orderNumber ?? "—"}</Td>
                  <Td>{item.boutiqueName}</Td>
                  <Td className="tabular-nums font-semibold text-rose-700">
                    {rupees(item.amountOwedPaise)}
                  </Td>
                  <Td className="max-w-[320px] text-slate-600">{item.reason}</Td>
                  <Td className="text-slate-500">{shortDate(item.createdAt)}</Td>
                  <Td>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy === item._id}
                        onClick={() => handleResolve(item._id, "recovered")}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition-all disabled:opacity-60 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3 inline mr-1" />
                        Recovered
                      </button>
                      <button
                        type="button"
                        disabled={busy === item._id}
                        onClick={() => handleResolve(item._id, "written_off")}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-all disabled:opacity-60 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3 inline mr-1" />
                        Write off
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
              {recovery && recovery.length === 0 && (
                <EmptyRow
                  colSpan={6}
                  message="Nothing to recover. Reversals are succeeding as expected."
                />
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Plain-language account of what a redemption actually did to the money. */
function RedemptionSummary({ redemption }: { redemption: any }) {
  if (redemption.case === "A") {
    return (
      <span>
        Spent on a {rupees(redemption.newOrderTotalPaise)} order · customer paid{" "}
        <strong className="text-slate-900">{rupees(redemption.customerPaidPaise)}</strong> extra
      </span>
    );
  }
  if (redemption.case === "B") {
    return (
      <span>
        Spent on a {rupees(redemption.newOrderTotalPaise)} order ·{" "}
        <strong className="text-slate-900">{rupees(redemption.refundedToCustomerPaise)}</strong>{" "}
        refunded
        {redemption.settlementStatus === "recovery_required" && (
          <span className="text-rose-600 font-semibold"> · refund failed</span>
        )}
      </span>
    );
  }
  return <span>Exact swap · no money moved</span>;
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "amber" | "slate" | "rose";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50",
    slate: "border-slate-200 bg-white",
    rose: "border-rose-200 bg-rose-50",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="text-2xl font-black text-slate-900 tabular-nums mt-1">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td className={`px-4 py-3 align-top ${className}`} title={title}>
      {children}
    </td>
  );
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-slate-400 text-xs">
        <Clock className="w-4 h-4 mx-auto mb-2 opacity-40" />
        {message}
      </td>
    </tr>
  );
}
