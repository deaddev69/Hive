export class ExperienceService {
  /**
   * Fetches the raw Experience and its ordered active blocks.
   */
  static async getRawExperienceAndBlocks(
    ctx: any,
    slug: string
  ): Promise<{ experienceRaw: any; blocksRaw: any[] } | null> {
    const experienceRaw = await ctx.db
      .query("experiences")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();

    if (!experienceRaw || experienceRaw.status !== "published") {
      return null;
    }

    const blocksRaw = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q: any) =>
        q.eq("experienceId", experienceRaw._id).eq("status", "published")
      )
      .collect();

    // Sort by sortOrder explicitly to be safe
    blocksRaw.sort((a: any, b: any) => a.sortOrder - b.sortOrder);

    return { experienceRaw, blocksRaw };
  }
}
