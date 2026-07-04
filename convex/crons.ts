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

// Sweep expired checkout sessions every 5 minutes
crons.interval(
  "clean_expired_checkout_sessions_every_5_minutes",
  { minutes: 5 },
  internal.payments.cleanExpiredCheckoutSessions
);

// Sweep merchant unaccepted order SLA timeouts every 5 minutes
crons.interval(
  "check_merchant_sla_timeouts_every_5_minutes",
  { minutes: 5 },
  internal.orders.checkMerchantSLATimeouts
);

// Process refund queue every 5 minutes (calls Razorpay Refund API)
crons.interval(
  "process_refund_queue_every_5_minutes",
  { minutes: 5 },
  internal.payments.processRefundQueue
);

// Clean up orphaned and failed media uploads hourly
crons.hourly(
  "media_orphan_cleanup",
  { minuteUTC: 15 }, // Offset by 15 mins to spread load
  internal.media.cleanup.cleanupOrphans
);

// Reconcile stuck shipments daily at 2am IST (20:30 UTC)
crons.daily(
  "reconcile_stuck_shipments",
  { hourUTC: 20, minuteUTC: 30 },
  internal.lib.shiprocket.reconcileStuckShipments
);

export default crons;
