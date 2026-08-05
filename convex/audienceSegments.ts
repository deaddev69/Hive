import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all audience segments for selection in marketing campaign studio
 */
export const listSegments = query({
  args: {},
  handler: async (ctx) => {
    const segments = await ctx.db.query("audienceSegments").collect();
    
    // Fallback system defaults if table is empty
    if (segments.length === 0) {
      return [
        {
          _id: "everyone",
          name: "Everyone (All PWA Devices)",
          description: "All active customer PWA app installations and push subscribers",
          segmentType: "SYSTEM" as const,
          definition: "all",
          createdAt: Date.now(),
        },
        {
          _id: "test_devices",
          name: "Test Devices (Internal Staff)",
          description: "Registered admin and QA test devices for campaign validation",
          segmentType: "SYSTEM" as const,
          definition: "test_devices",
          createdAt: Date.now(),
        },
      ];
    }

    return segments;
  },
});

/**
 * Seed default SYSTEM audience segments if not present
 */
export const seedDefaultSegments = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("audienceSegments").collect();
    if (existing.length > 0) return existing.length;

    await ctx.db.insert("audienceSegments", {
      name: "Everyone (All PWA Devices)",
      description: "All active customer PWA app installations and push subscribers",
      segmentType: "SYSTEM",
      definition: "all",
      createdAt: Date.now(),
    });

    await ctx.db.insert("audienceSegments", {
      name: "Test Devices (Internal Staff)",
      description: "Registered admin and QA test devices for campaign validation",
      segmentType: "SYSTEM",
      definition: "test_devices",
      createdAt: Date.now(),
    });

    return 2;
  },
});
