// packages/utils/src/order.ts
// Order status display helpers

import type { OrderStatus } from "@hive/types";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment:        "Awaiting Payment",
  pending_confirmation:   "Pending Confirmation",
  confirmed:              "Confirmed",
  pickup_scheduled:       "Pickup Scheduled",
  picked_up:              "Picked Up",
  in_transit:             "In Transit",
  out_for_delivery:       "Out for Delivery",
  delivered:              "Delivered",
  cancelled:              "Cancelled",
  claim_submitted:        "Claim Submitted",
  replacement_requested:  "Replacement Requested",
  replacement_approved:   "Replacement Approved",
  replacement_dispatched: "Replacement Dispatched",
  replacement_delivered:  "Replacement Delivered",
  refund_requested:       "Refund Requested",
  refunded:               "Refunded",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending_payment:        "amber",
  pending_confirmation:   "amber",
  confirmed:              "blue",
  pickup_scheduled:       "blue",
  picked_up:              "indigo",
  in_transit:             "indigo",
  out_for_delivery:       "violet",
  delivered:              "green",
  cancelled:              "red",
  claim_submitted:        "orange",
  replacement_requested:  "orange",
  replacement_approved:   "blue",
  replacement_dispatched: "indigo",
  replacement_delivered:  "green",
  refund_requested:       "orange",
  refunded:               "green",
};

/** Terminal states — no further transitions expected */
export const TERMINAL_ORDER_STATES: OrderStatus[] = [
  "delivered",
  "cancelled",
  "replacement_delivered",
  "refunded",
];

export function isOrderCancellable(status: OrderStatus): boolean {
  return status === "pending_payment" || status === "pending_confirmation";
}

export function isClaimEligible(status: OrderStatus): boolean {
  return status === "delivered";
}
