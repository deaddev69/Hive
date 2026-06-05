// convex/lib/audit.ts
// Audit log helper — call this from every state-changing mutation.

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

interface AuditLogParams {
  ctx: MutationCtx;
  actorId?: Id<"users">;
  actorRole: string;
  action: string;          // e.g. "order.confirmed", "product.approved"
  entityType: string;      // e.g. "orders", "products"
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog({
  ctx,
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  before,
  after,
  metadata,
}: AuditLogParams) {
  await ctx.db.insert("auditLogs", {
    actorId,
    actorRole,
    action,
    entityType,
    entityId,
    before:   before   ? JSON.stringify(before)   : undefined,
    after:    after    ? JSON.stringify(after)     : undefined,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    createdAt: Date.now(),
  });
}
