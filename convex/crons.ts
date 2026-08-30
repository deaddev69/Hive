// convex/crons.ts
// Scheduler file for automated background tasks.
// Excludes reconciliation_scan per logistics provider optimization.

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run settlement cron hourly
crons.hourly(
  "settlement_cron_hourly",
  { minuteUTC: 0 }, // Runs at the start of every hour (0 minutes past the hour)
  internal.adminObservability.triggerCronJobInternal,
  { cronName: "settlement_cron" }
);

// Run performance recalc cron every 6 hours
crons.interval(
  "performance_recalc_every_6_hours",
  { hours: 6 }, // Runs every 6 hours
  internal.adminObservability.triggerCronJobInternal,
  { cronName: "performance_recalc" }
);

// Sweep expired checkout sessions every 15 minutes (was 5 — reduced to cut I/O)
crons.interval(
  "clean_expired_checkout_sessions_every_5_minutes",
  { minutes: 15 },
  internal.payments.cleanExpiredCheckoutSessions
);


// Razorpay auto-releases a transfer when its on_hold_until passes and sends no
// webhook, so sweep hourly to mark those payouts paid.
crons.interval(
  "reconcile_released_holds_hourly",
  { hours: 1 },
  internal.adminFinance.reconcileReleasedHolds
);

// Expire exchange coupons past their 30-day window and refund the customer.
// Expiry is not forfeiture — the customer returned goods, so the money goes
// back to their original payment method.
crons.interval(
  "expire_coupons_hourly",
  { hours: 1 },
  internal.coupons.expireCoupons
);

// Lapse exchange requests the seller never answered inside 24h, releasing the
// payout hold the request had placed.
crons.interval(
  "expire_pending_exchanges_every_30_minutes",
  { minutes: 30 },
  internal.exchanges.expirePendingExchanges
);

// Process refund queue every 15 minutes (was 5 — reduced to cut I/O)
crons.interval(
  "process_refund_queue_every_5_minutes",
  { minutes: 15 },
  internal.payments.processRefundQueue
);

// Clean up orphaned and failed media uploads hourly
crons.hourly(
  "media_orphan_cleanup",
  { minuteUTC: 15 }, // Offset by 15 mins to spread load
  internal.media.cleanup.cleanupOrphans
);

// Safety cron: Sweep unaccepted orders > 45 minutes every 5 minutes
crons.interval(
  "sweep_unaccepted_orders_sla_every_5_minutes",
  { minutes: 5 },
  internal.orders.sweepUnacceptedOrdersSLA
);



export default crons;
