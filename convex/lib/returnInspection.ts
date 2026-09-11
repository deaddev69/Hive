// convex/lib/returnInspection.ts
// Who may decide a returned item, and what settling it means.
//
// A return used to settle itself the moment Porter dropped the item at the
// boutique: a cash refund, or a coupon for an exchange, with nobody having
// looked at what came back. Now the item waits at "delivered" until someone
// decides. The seller can accept or reject it; admin can accept, and decides
// every rejection. Nothing moves the customer's money until one of them acts.
//
// Pure, so the rules are tested without a Convex runtime.

export type InspectionDecision = "accepted" | "rejected";
export type RejectionResolution = "refunded" | "no_refund";

export type ReturnInspection = {
  decision: InspectionDecision;
  byRole: "seller" | "admin";
  at: number;
  reason?: string;
  resolution?: RejectionResolution;
  resolvedAt?: number;
};

export type InspectableOrder = {
  returnStatus?: string | null;
  returnInspection?: ReturnInspection | null;
};

export type InspectionGate = { ok: true } | { ok: false; message: string };

/** The item is physically back and the return has not already been settled. */
function atStore(order: InspectableOrder): InspectionGate {
  if (order.returnStatus === "completed") {
    return { ok: false, message: "This return has already been settled." };
  }
  if (order.returnStatus !== "delivered") {
    return {
      ok: false,
      message: "The item hasn't reached the boutique yet. It can be checked once it arrives.",
    };
  }
  return { ok: true };
}

/**
 * The seller gets one decision per return. Once they have accepted or
 * rejected, the next step belongs to admin.
 */
export function canSellerDecide(order: InspectableOrder): InspectionGate {
  const store = atStore(order);
  if (!store.ok) return store;
  const existing = order.returnInspection;
  if (existing) {
    return {
      ok: false,
      message:
        existing.decision === "accepted"
          ? "You've already accepted this return."
          : "You've already rejected this return. Hive is reviewing it.",
    };
  }
  return { ok: true };
}

/**
 * Admin may accept a fresh return, and may also accept one the seller rejected
 * — that is admin deciding the customer is refunded after all.
 */
export function canAdminAccept(order: InspectableOrder): InspectionGate {
  const store = atStore(order);
  if (!store.ok) return store;
  const existing = order.returnInspection;
  if (existing?.decision === "accepted") {
    return { ok: false, message: "This return has already been accepted." };
  }
  if (existing?.resolution) {
    return { ok: false, message: "This rejected return has already been decided." };
  }
  return { ok: true };
}

/** Only a rejected, undecided return is waiting on admin. */
export function canAdminResolveRejection(order: InspectableOrder): InspectionGate {
  const existing = order.returnInspection;
  if (existing?.decision !== "rejected") {
    return { ok: false, message: "Only a return the seller rejected needs a decision." };
  }
  if (existing.resolution) {
    return { ok: false, message: "This rejected return has already been decided." };
  }
  const store = atStore(order);
  if (!store.ok) return store;
  return { ok: true };
}

/**
 * What accepting the return pays out.
 *
 * An accepted exchange is settled with store credit; a completed one already
 * was, so accepting again must not also refund cash. Everything else is a cash
 * refund of what the customer paid.
 */
export function settlementFlowFor(
  exchange: { status?: string | null } | null | undefined
): "coupon" | "refund" | "none" {
  if (exchange?.status === "accepted") return "coupon";
  if (exchange?.status === "completed") return "none";
  return "refund";
}
