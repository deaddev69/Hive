import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all campaigns alongside their executions and aggregated metrics
 */
export const listCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const campaigns = await ctx.db.query("campaigns").order("desc").collect();

    const enriched = await Promise.all(
      campaigns.map(async (camp) => {
        const executions = await ctx.db
          .query("campaignExecutions")
          .withIndex("by_campaignId", (q) => q.eq("campaignId", camp._id))
          .order("desc")
          .collect();

        // Calculate aggregated raw metrics
        const totalSent = executions.reduce((sum, e) => sum + (e.metrics?.sent || 0), 0);
        const totalDelivered = executions.reduce((sum, e) => sum + (e.metrics?.delivered || 0), 0);
        const totalClicked = executions.reduce((sum, e) => sum + (e.metrics?.clicked || 0), 0);
        const totalFailed = executions.reduce((sum, e) => sum + (e.metrics?.failed || 0), 0);

        return {
          ...camp,
          executions,
          aggregateMetrics: {
            sent: totalSent,
            delivered: totalDelivered,
            clicked: totalClicked,
            failed: totalFailed,
          },
        };
      })
    );

    return enriched;
  },
});

/**
 * Get a single campaign by slug
 */
export const getCampaignBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("campaigns")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Create a new campaign definition
 */
export const createCampaign = mutation({
  args: {
    title: v.string(),
    slug: v.optional(v.string()),
    type: v.union(
      v.literal("EDITORIAL"),
      v.literal("SEASONAL"),
      v.literal("ANNOUNCEMENT"),
      v.literal("PRODUCT"),
      v.literal("DELIVERY")
    ),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    collectionId: v.optional(v.string()),
    audienceSegmentId: v.optional(v.id("audienceSegments")),
    assets: v.array(
      v.object({
        type: v.union(
          v.literal("hero"),
          v.literal("banner"),
          v.literal("thumbnail"),
          v.literal("push")
        ),
        url: v.string(),
        alt: v.optional(v.string()),
        sortOrder: v.optional(v.number()),
      })
    ),
    messaging: v.object({
      pushTitle: v.string(),
      pushBody: v.string(),
      targetUrl: v.string(),
    }),
    schedule: v.optional(
      v.object({
        startDate: v.number(),
        endDate: v.optional(v.number()),
        timezone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const rawSlug = args.slug || args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    
    // Ensure slug uniqueness
    const existing = await ctx.db
      .query("campaigns")
      .withIndex("by_slug", (q) => q.eq("slug", rawSlug))
      .first();

    const slug = existing ? `${rawSlug}-${Date.now().toString().slice(-4)}` : rawSlug;
    const now = Date.now();

    const id = await ctx.db.insert("campaigns", {
      title: args.title,
      slug,
      type: args.type,
      subtitle: args.subtitle,
      description: args.description,
      status: "draft",
      collectionId: args.collectionId,
      audienceSegmentId: args.audienceSegmentId,
      assets: args.assets,
      messaging: args.messaging,
      schedule: args.schedule,
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

/**
 * Update an existing campaign
 */
export const updateCampaign = mutation({
  args: {
    id: v.id("campaigns"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("scheduled"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("archived")
      )
    ),
    collectionId: v.optional(v.string()),
    audienceSegmentId: v.optional(v.id("audienceSegments")),
    assets: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal("hero"),
            v.literal("banner"),
            v.literal("thumbnail"),
            v.literal("push")
          ),
          url: v.string(),
          alt: v.optional(v.string()),
          sortOrder: v.optional(v.number()),
        })
      )
    ),
    messaging: v.optional(
      v.object({
        pushTitle: v.string(),
        pushBody: v.string(),
        targetUrl: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Campaign not found");

    const patch: any = { updatedAt: Date.now() };
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.subtitle !== undefined) patch.subtitle = updates.subtitle;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.collectionId !== undefined) patch.collectionId = updates.collectionId;
    if (updates.audienceSegmentId !== undefined) patch.audienceSegmentId = updates.audienceSegmentId;
    if (updates.assets !== undefined) patch.assets = updates.assets;
    if (updates.messaging !== undefined) patch.messaging = updates.messaging;

    await ctx.db.patch(id, patch);
  },
});

/**
 * Duplicate a campaign as a new draft
 */
export const duplicateCampaign = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    const source = await ctx.db.get(args.id);
    if (!source) throw new Error("Source campaign not found");

    const now = Date.now();
    const newSlug = `${source.slug}-copy-${now.toString().slice(-4)}`;

    const newId = await ctx.db.insert("campaigns", {
      title: `${source.title} (Copy)`,
      slug: newSlug,
      type: source.type,
      subtitle: source.subtitle,
      description: source.description,
      status: "draft",
      collectionId: source.collectionId,
      audienceSegmentId: source.audienceSegmentId,
      assets: source.assets,
      messaging: source.messaging,
      createdAt: now,
      updatedAt: now,
    });

    return newId;
  },
});

/**
 * Internal mutation to record a campaign execution log
 */
export const recordExecutionInternal = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    channel: v.union(
      v.literal("push"),
      v.literal("homepage"),
      v.literal("banner"),
      v.literal("email"),
      v.literal("whatsapp")
    ),
    status: v.union(
      v.literal("sending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    triggeredBy: v.union(
      v.literal("manual"),
      v.literal("schedule"),
      v.literal("api")
    ),
    sentAt: v.number(),
    metrics: v.object({
      sent: v.number(),
      delivered: v.number(),
      failed: v.number(),
      clicked: v.number(),
    }),
    sentBy: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const executionId = await ctx.db.insert("campaignExecutions", {
      campaignId: args.campaignId,
      channel: args.channel,
      status: args.status,
      triggeredBy: args.triggeredBy,
      sentAt: args.sentAt,
      metrics: args.metrics,
      sentBy: args.sentBy,
      error: args.error,
    });

    // Update lastExecutedAt & status on campaign table
    await ctx.db.patch(args.campaignId, {
      lastExecutedAt: args.sentAt,
      status: args.status === "completed" ? "completed" : "running",
      updatedAt: Date.now(),
    });

    return executionId;
  },
});
