import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole, getCurrentUserOrNull } from "./lib/auth";

/**
 * Normalizes a title or string into a clean, URL-safe slug
 */
export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * 1. Public Query: Fetch a single blog post by its slug.
 * Returns published posts to any visitor, or drafts if viewed by an authenticated admin.
 */
export const getPostBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!post) {
      return null;
    }

    if (post.status === "published") {
      return post;
    }

    // If draft, allow preview only for admins
    const currentUser = await getCurrentUserOrNull(ctx);
    if (currentUser && currentUser.role === "admin") {
      return post;
    }

    return null;
  },
});

/**
 * 2. Public Query: Fetch all published blog posts for the blog directory and sitemap.
 */
export const getPublishedPosts = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    // Sort newest published first
    posts.sort((a, b) => {
      const timeA = a.publishedAt ?? a._creationTime;
      const timeB = b.publishedAt ?? b._creationTime;
      return timeB - timeA;
    });

    if (args.category && args.category !== "All") {
      posts = posts.filter((p) => p.category === args.category);
    }

    if (args.limit && args.limit > 0) {
      posts = posts.slice(0, args.limit);
    }

    return posts;
  },
});

/**
 * 3. Admin Query: Fetch all blog posts (drafts and published) for the admin dashboard.
 */
export const getAllPostsAdmin = query({
  args: {
    status: v.optional(v.union(v.literal("all"), v.literal("draft"), v.literal("published"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let posts = await ctx.db.query("blogPosts").collect();

    // Sort by latest update or creation
    posts.sort((a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime));

    if (args.status && args.status !== "all") {
      posts = posts.filter((p) => p.status === args.status);
    }

    if (args.search && args.search.trim() !== "") {
      const searchLower = args.search.toLowerCase().trim();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.slug.toLowerCase().includes(searchLower) ||
          p.excerpt.toLowerCase().includes(searchLower) ||
          (p.category && p.category.toLowerCase().includes(searchLower))
      );
    }

    return posts;
  },
});

/**
 * 4. Admin Query: Fetch a blog post by ID for editing.
 */
export const getPostByIdAdmin = query({
  args: {
    id: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new ConvexError("Blog post not found.");
    }
    return post;
  },
});

/**
 * 5. Admin Mutation: Create a new blog post.
 */
export const createPost = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    excerpt: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    category: v.optional(v.string()),
    readTime: v.optional(v.string()),
    authorName: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    primaryKeyword: v.optional(v.string()),
    secondaryKeywords: v.optional(v.array(v.string())),
    actionableTips: v.optional(v.array(v.string())),
    faqs: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    const cleanSlug = formatSlug(args.slug || args.title);
    if (!cleanSlug) {
      throw new ConvexError("A valid slug or title is required.");
    }

    // Check slug uniqueness
    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", cleanSlug))
      .first();

    if (existing) {
      throw new ConvexError(`A blog post with slug '${cleanSlug}' already exists.`);
    }

    const now = Date.now();
    const publishedAt = args.status === "published" ? now : undefined;

    const postId = await ctx.db.insert("blogPosts", {
      title: args.title.trim(),
      slug: cleanSlug,
      content: args.content,
      coverImageUrl: args.coverImageUrl,
      excerpt: args.excerpt.trim(),
      status: args.status,
      authorId: admin.clerkId || (admin._id as string),
      authorName: args.authorName || admin.name || "Hive Editorial Team",
      publishedAt,
      category: args.category || "Platform Guides",
      readTime: args.readTime || "5 min read",
      seoTitle: args.seoTitle || args.title,
      metaDescription: args.metaDescription || args.excerpt,
      primaryKeyword: args.primaryKeyword,
      secondaryKeywords: args.secondaryKeywords,
      actionableTips: args.actionableTips,
      faqs: args.faqs,
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

/**
 * 6. Admin Mutation: Update an existing blog post.
 */
export const updatePost = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    coverImageUrl: v.optional(v.string()),
    excerpt: v.string(),
    status: v.union(v.literal("draft"), v.literal("published")),
    category: v.optional(v.string()),
    readTime: v.optional(v.string()),
    authorName: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    primaryKeyword: v.optional(v.string()),
    secondaryKeywords: v.optional(v.array(v.string())),
    actionableTips: v.optional(v.array(v.string())),
    faqs: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new ConvexError("Blog post not found.");
    }

    const cleanSlug = formatSlug(args.slug || args.title);
    if (!cleanSlug) {
      throw new ConvexError("A valid slug or title is required.");
    }

    // If slug changed, verify uniqueness
    if (cleanSlug !== post.slug) {
      const existing = await ctx.db
        .query("blogPosts")
        .withIndex("by_slug", (q) => q.eq("slug", cleanSlug))
        .first();

      if (existing && existing._id !== args.id) {
        throw new ConvexError(`A blog post with slug '${cleanSlug}' already exists.`);
      }
    }

    const now = Date.now();
    let publishedAt = post.publishedAt;
    if (args.status === "published" && !publishedAt) {
      publishedAt = now;
    }

    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      slug: cleanSlug,
      content: args.content,
      coverImageUrl: args.coverImageUrl,
      excerpt: args.excerpt.trim(),
      status: args.status,
      authorName: args.authorName || post.authorName,
      publishedAt,
      category: args.category || post.category,
      readTime: args.readTime || post.readTime,
      seoTitle: args.seoTitle || args.title,
      metaDescription: args.metaDescription || args.excerpt,
      primaryKeyword: args.primaryKeyword,
      secondaryKeywords: args.secondaryKeywords,
      actionableTips: args.actionableTips,
      faqs: args.faqs,
      updatedAt: now,
    });

    return args.id;
  },
});

/**
 * 7. Admin Mutation: Publish a blog post immediately.
 */
export const publishPost = mutation({
  args: {
    id: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new ConvexError("Blog post not found.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "published",
      publishedAt: post.publishedAt || now,
      updatedAt: now,
    });

    return args.id;
  },
});

/**
 * 8. Admin Mutation: Unpublish a blog post (set back to draft).
 */
export const unpublishPost = mutation({
  args: {
    id: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new ConvexError("Blog post not found.");
    }

    await ctx.db.patch(args.id, {
      status: "draft",
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

/**
 * 9. Admin Mutation: Delete a blog post.
 */
export const deletePost = mutation({
  args: {
    id: v.id("blogPosts"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new ConvexError("Blog post not found.");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
