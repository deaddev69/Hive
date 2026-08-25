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
 * 2. Public Query: Look up if an old slug was previously mapped to a new slug for 301 redirects.
 */
export const getSlugRedirect = query({
  args: {
    oldSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const redirect = await ctx.db
      .query("blogSlugRedirects")
      .withIndex("by_oldSlug", (q) => q.eq("oldSlug", args.oldSlug))
      .first();

    if (!redirect) {
      return null;
    }

    return {
      newSlug: redirect.newSlug,
      postId: redirect.postId,
    };
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user || user.role !== "admin") {
      return [];
    }

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
          (p.title && p.title.toLowerCase().includes(searchLower)) ||
          (p.slug && p.slug.toLowerCase().includes(searchLower)) ||
          (p.excerpt && p.excerpt.toLowerCase().includes(searchLower)) ||
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user || user.role !== "admin") {
      return null;
    }
    const post = await ctx.db.get(args.id);
    if (!post) {
      return null;
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
      authorName: args.authorName || "Hive Editorial Team",
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

    // If slug changed on an already-published post, maintain the 301 permanent redirect chain
    if (cleanSlug !== post.slug && post.status === "published") {
      const existingRedirect = await ctx.db
        .query("blogSlugRedirects")
        .withIndex("by_oldSlug", (q) => q.eq("oldSlug", post.slug))
        .first();

      if (existingRedirect) {
        await ctx.db.patch(existingRedirect._id, {
          newSlug: cleanSlug,
          createdAt: now,
        });
      } else {
        await ctx.db.insert("blogSlugRedirects", {
          oldSlug: post.slug,
          newSlug: cleanSlug,
          postId: args.id,
          createdAt: now,
        });
      }

      // If any previous redirects pointed to oldSlug, forward them to the new cleanSlug
      const previousRedirects = await ctx.db
        .query("blogSlugRedirects")
        .filter((q) => q.eq(q.field("newSlug"), post.slug))
        .collect();

      for (const prev of previousRedirects) {
        await ctx.db.patch(prev._id, {
          newSlug: cleanSlug,
        });
      }
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

    // Clean up any associated redirect records
    const associatedRedirects = await ctx.db
      .query("blogSlugRedirects")
      .withIndex("by_postId", (q) => q.eq("postId", args.id))
      .collect();

    for (const r of associatedRedirects) {
      await ctx.db.delete(r._id);
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * 10. Admin Mutation: Seed foundational blog articles into Convex database.
 */
export const seedInitialBlogPosts = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, "admin");
    const now = Date.now();

    const initialPosts = [
      {
        title: "What Is Hive and How Does It Work? A Practical Guide to Kochi’s Hyperlocal Fashion Marketplace",
        slug: "what-is-hive-and-how-does-it-work",
        seoTitle: "What Is Hive and How Does It Work? | Kochi’s Hyperlocal Fashion Marketplace",
        metaDescription: "Discover Hive, a hyperlocal fashion marketplace connecting shoppers with independent boutiques across Kochi. Shop local showrooms online with same-day delivery.",
        primaryKeyword: "hyperlocal fashion marketplace Kerala",
        secondaryKeywords: ["shop local boutiques Kochi", "online boutique shopping Kochi", "same day saree delivery Kerala"],
        category: "Platform Guides",
        readTime: "7 min read",
        authorName: "Hive Editorial Team",
        coverImageUrl: "/images/trust_box.png",
        status: "published" as const,
        excerpt: "Discover how Hive connects shoppers with independent boutiques across Kochi online, offering showroom-fresh fashion with rapid same-day local courier delivery.",
        content: `## Why Fashion Shopping in Kerala Needed a New Approach\n\nFashion across Kerala is shaped by two major factors: rich textile heritage and high tropical humidity. Discerning shoppers naturally gravitate toward breathable, high-quality fabrics rather than synthetic fast fashion.\n\n### The Challenge of Physical Boutique Trips\nIndependent boutiques and design studios in Kochi produce exceptional attire, but discovering them physically requires significant effort:\n* **Traffic & Time Limitations:** Driving between stores across Panampilly Nagar, MG Road, and Kaloor can consume half a day just to check what sizes are currently on the racks.\n* **Fragmented Online Catalogues:** Many local stores rely on informal social media updates. Asking for size measurements, fabric blends, and price confirmations via text messages often slows down the buying process.\n\n### The Limits of National Fast-Fashion Platforms\nWhen shoppers turn to national mass-market platforms out of habit, common frustrations emerge:\n* **Slow Shipping:** Packages dispatched from centralized warehouses take several business days to arrive, making same-day or next-day outfit planning impossible.\n* **Synthetic Fabric Dominance:** Mass-produced garments frequently use polyester or heavy synthetic blends that trap body heat and feel uncomfortable in coastal humidity.\n\nBy focusing purely on local independent showrooms within your city, a hyperlocal marketplace bridges this gap—giving you instant visibility into what is hanging on the racks right near you today.\n\n---\n\n## What Exactly Is Hive (\`hivenow.in\`)?\n\nAt its core, **Hive is a digital marketplace that connects independent fashion boutiques with neighborhood shoppers.**\n\nInstead of operating centralized warehouses or handling fabric manufacturing directly, the platform functions as a transparent bridge between independent store owners and fashion enthusiasts. Every item listed on the platform exists right now inside a real boutique showroom across Kochi.\n\n### How the Marketplace Model Operates\n1. **Direct Showroom Sync:** Partner boutiques manage their own digital storefronts, uploading real-time stock levels for sizing (\`S, M, L, XL\`) and transparent pricing.\n2. **Zero Middlemen Handling:** The platform does not alter clothes, handle fabrics, or provide tailoring modifications. Garments remain safely stored in the boutique's climate-controlled showroom until a customer places an order.\n3. **Third-Party Local Courier Network:** Once a boutique confirms and packs an order, trusted local courier partners are dispatched to pick up the package and deliver it directly to the customer’s address within hours.`,
        actionableTips: [
          "Enter Your Area Pincode First: Always confirm your exact delivery pincode on the homepage to ensure you are browsing showrooms within active same-day courier reach.",
          "Read the Fabric Composition: Check the material details before purchasing. Prioritize natural fibers like cotton, silk blends, and linen for daytime comfort.",
          "Explore the Boutique’s Full Catalog: If you discover a top or tunic that fits your aesthetic, click the boutique name to view their entire showroom collection."
        ],
        faqs: [
          {
            question: "What areas across Kochi are covered for delivery?",
            answer: "The platform covers key residential and commercial neighborhoods across Kochi, including Panampilly Nagar, Ravipuram, Kaloor, Edappally, Kakkanad, Fort Kochi, and surrounding city limits."
          },
          {
            question: "How fast does same-day courier delivery take?",
            answer: "For orders placed during standard daytime operational windows, third-party local couriers typically pick up and deliver directly from the store to your doorstep within hours on the very same day."
          }
        ]
      },
      {
        title: "How to Choose the Perfect Kurti for Kerala Weather: A Practical Fabric & Cut Guide",
        slug: "how-to-choose-perfect-kurti-kerala-weather",
        seoTitle: "Best Cotton Kurtis for Kerala Weather: Buying & Styling Guide",
        metaDescription: "Discover how to choose breathable, lightweight kurtis for Kerala's humid climate. Explore fabric tips, sleeve styles, and local sizing advice.",
        primaryKeyword: "breathable cotton kurtis Kerala",
        secondaryKeywords: ["kurtis for hot humid weather", "handloom cotton kurti Kochi", "A-line cotton kurtas Kerala"],
        category: "Women's Fashion",
        readTime: "6 min read",
        authorName: "Anjali Menon",
        coverImageUrl: "/images/trust_hangers.png",
        status: "published" as const,
        excerpt: "Navigate Kerala's coastal humidity with effortless grace. From 60s count pure cotton to A-line silhouettes, here is how to pick daily wear kurtis that stay crisp all day.",
        content: `## The Tropical Dilemma: Balancing Elegance and Airflow\n\nLiving in coastal Kerala means dealing with ambient relative humidity that frequently tops 80%. When choosing daily ethnic attire, synthetic fabrics like polyester blends and nylon trap body moisture, causing discomfort and heat rashes within hours.\n\nA well-constructed cotton kurti from a local independent boutique isn't just a style statement—it is a functional garment engineered for climate comfort.\n\n---\n\n## 1. Fabric Selection: Why Cotton Counts Matter\n\nNot all cotton is created equal. When browsing boutique racks or online collections in Kochi, look closely at the weave density:\n\n* **60s to 80s Count Pure Cotton:** The sweet spot for daily wear. Fine enough to feel featherlight on the skin while maintaining an opaque, structured drape for professional settings.\n* **South Indian Handloom Cotton:** Woven on traditional wooden pit looms, handloom cotton has microscopic irregularities in the yarn that maximize cross-ventilation.\n* **Mulmul (Fine Voile):** Ultra-soft, lightweight cotton ideal for casual daytime outings and home lounging.\n* **Linen-Cotton Blends:** Combines the anti-wrinkle resilience of cotton with the superior thermoregulation of flax linen.`,
        actionableTips: [
          "Avoid Heavy Lining: If a daily wear kurti requires a thick synthetic lining to be opaque, skip it. Choose medium-weight handloom cotton that is naturally opaque.",
          "Check Armhole Depth: Make sure armholes allow at least 1-1.5 inches of ease to prevent friction and perspiration marks."
        ],
        faqs: [
          {
            question: "What is the best fabric for daily wear kurtis in Kochi?",
            answer: "Pure 60s count combed cotton and authentic Kerala handloom cotton are the best choices, offering maximum sweat absorption and rapid airflow in high humidity."
          }
        ]
      },
      {
        title: "Linen vs. Cotton Shirts: Which Is Truly Better for Kerala’s Tropical Heat?",
        slug: "linen-vs-cotton-shirts-kerala-heat",
        seoTitle: "Linen vs Cotton Shirts: Best Fabric for Kerala Heat & Humidity",
        metaDescription: "Compare pure linen and fine cotton shirts for men in high humidity. Discover sweat absorption, wrinkle control, and styling advice for Kochi.",
        primaryKeyword: "linen vs cotton shirts Kerala heat",
        secondaryKeywords: ["mens linen shirts Kochi", "smart casual shirts Kerala", "pure linen shirts for humidity"],
        category: "Men's Styling",
        readTime: "5 min read",
        authorName: "Rohan Varghese",
        coverImageUrl: "/vibe_model_1.png",
        status: "published" as const,
        excerpt: "Comparing pure flax linen against luxury Egyptian and handloom cotton. Here is the definitive breakdown of breathability, wrinkle resilience, and office aesthetics.",
        content: `## The Battle of Natural Fibers in Coastal Humidity\n\nFor professionals and style-conscious men in Kochi, choosing between pure linen and fine cotton is a daily morning decision. Both natural fibers outperform synthetic polyester blends by orders of magnitude, but they behave very differently in humid heat.\n\n---\n\n## Direct Comparison: Linen vs. Cotton\n\n| Feature | Pure Linen (Flax) | Fine Cotton (60s-100s) |\n| :--- | :--- | :--- |\n| **Air Permeability** | Exceptionally High (Open weave) | High (Depends on weave) |\n| **Moisture Absorption** | Holds up to 20% moisture before feeling damp | Absorbs quickly, dries moderately fast |\n| **Drying Speed** | Extremely Fast | Moderate |\n| **Wrinkle Characteristics** | Natural, relaxed crumple | Smooth finish with light ironing |\n| **Ideal Setting** | Smart casuals, weekend brunches, evening outings | Formal boardroom meetings, structured corporate attire |`,
        actionableTips: [
          "Opt for French Seams: Look for boutique shirts constructed with flat-felled or French seams to eliminate internal scratchiness against skin.",
          "Steam Don't Scorch: Use a handheld garment steamer for linen shirts to relax the fibers naturally."
        ],
        faqs: [
          {
            question: "Does pure linen shrink when washed?",
            answer: "Pre-washed boutique linen will have minimal shrinkage (under 2%). Always wash in cold water and air dry on a broad hanger."
          }
        ]
      },
      {
        title: "Kuthampully vs. Balaramapuram: The Ultimate Guide to Kerala’s Iconic Handlooms",
        slug: "kuthampully-vs-balaramapuram-sarees",
        seoTitle: "Kuthampully vs Balaramapuram Sarees: Kerala Handloom Heritage Guide",
        metaDescription: "Discover the differences in thread count, zari quality, and weaving techniques between Kerala's two most famous handloom saree centers.",
        primaryKeyword: "kuthampully vs balaramapuram sarees",
        secondaryKeywords: ["Kerala kasavu saree guide", "pure cotton handloom sarees Kerala", "Balaramapuram fine cotton saree"],
        category: "Sarees & Traditional",
        readTime: "8 min read",
        authorName: "Lakshmi Nair",
        coverImageUrl: "/images/trust_model.png",
        status: "published" as const,
        excerpt: "Unravel the distinct weaving traditions, thread counts, and golden zari techniques that define Kerala's two greatest textile centers.",
        content: `## The Golden Heritage of Kerala Kasavu\n\nThe off-white cotton saree with its luminous golden border (*Kasavu*) is the quintessential symbol of South Indian grace. Yet many shoppers are unaware that Kerala's two heritage weaving hubs—**Balaramapuram** in Thiruvananthapuram and **Kuthampully** in Thrissur—produce fundamentally different handloom experiences.\n\n---\n\n## 1. Balaramapuram: The Benchmark of Featherlight Weaves\n\nDating back to the royal patronage of the Travancore Maharaja Balarama Varma in the late 18th century, Balaramapuram weavers specialize in **superfine unbleached cotton**:\n\n* **Ultra-Fine Thread Counts (80s to 120s):** The cotton yarn is spun so delicately that the saree drapes like a gentle second skin.\n* **Traditional Pit Looms & Rib Weaves:** The fabric features a soft, natural cream shade that softens with each wear.`,
        actionableTips: [
          "Identify Pure Handloom: Look for the government Handloom Mark and check the selvage of the saree.",
          "Store in Muslin Cloth: Never store pure zari kasavu sarees in plastic bags."
        ],
        faqs: [
          {
            question: "Which is better for weddings: Kuthampully or Balaramapuram?",
            answer: "Kuthampully sarees offer bolder zari designs and hold sharp pleats for photography, while Balaramapuram provides ultra-soft, breathable comfort."
          }
        ]
      },
      {
        title: "Co-ord Sets vs. Traditional Suits: What’s Trending Across Kochi’s Fashion Studios?",
        slug: "coord-sets-vs-traditional-suits-kochi",
        seoTitle: "Co-ord Sets vs Traditional Suits: Kochi Fashion Trends Guide",
        metaDescription: "Explore why co-ord sets are becoming Kochi's favorite everyday outfit alongside traditional suits. Styling tips and fabric recommendations.",
        primaryKeyword: "co ord sets for women Kochi",
        secondaryKeywords: ["western ethnic fusion Kochi", "printed cotton coord sets"],
        category: "Women's Fashion",
        readTime: "6 min read",
        authorName: "Sneha Kurian",
        coverImageUrl: "/vibe_model_2.png",
        status: "published" as const,
        excerpt: "From boardroom meetings in Kakkanad to weekend cafes in Panampilly Nagar, matching co-ord sets are redefining modern South Indian street style.",
        content: `## The Modern Silhouette Evolution in Kochi\n\nOver the past three years, Kochi's boutique landscape has undergone a dramatic stylistic evolution. While the classic salwar kameez and kurta-dupatta set remain timeless cultural staples, **breathable matching co-ord sets** have emerged as the dominant daytime favorite among young professionals, creative entrepreneurs, and college students.`,
        actionableTips: [
          "Proportion Balance: If the bottom is wide-leg and voluminous, opt for a tailored or cropped top.",
          "Monochrome Footwear: Pair neutral co-ords with tan leather Kolhapuris or minimalist slides."
        ],
        faqs: [
          {
            question: "Are co-ord sets considered formal enough for corporate offices in Kochi?",
            answer: "Yes, provided they are tailored in solid linen, raw silk, or structured cotton with collared tunics or blazer cuts."
          }
        ]
      },
      {
        title: "What to Wear for Brunch in Panampilly Nagar: The Definitive Kochi Cafe Style Guide",
        slug: "brunch-outfits-panampilly-nagar-kochi",
        seoTitle: "What to Wear for Brunch in Panampilly Nagar Kochi: Chic Outfits",
        metaDescription: "Looking for chic brunch outfit ideas? Discover lightweight linen tops, pastel dresses, and comfortable footwear for Kochi's cafe culture.",
        primaryKeyword: "brunch outfits Panampilly Nagar Kochi",
        secondaryKeywords: ["Kochi cafe fashion", "pastel dresses Kerala boutique"],
        category: "Kochi Guides",
        readTime: "5 min read",
        authorName: "Diya Thomas",
        coverImageUrl: "/vibe_model_3.png",
        status: "published" as const,
        excerpt: "From breezy floral linen dresses to relaxed artisanal cotton tunics, discover the best weekend outfit aesthetics for Kochi's premier boutique district.",
        content: `## The Chic Charm of Panampilly Nagar\n\nPanampilly Nagar is the cultural heartbeat of Kochi’s design, boutique shopping, and specialty cafe scene. With leafy boulevards lined with independent designer studios, art cafes, and artisanal bakeries, a weekend brunch here calls for a look that is effortlessly chic, breezy, and comfortable.`,
        actionableTips: [
          "Hydration & Sunscreen First: Pair lightweight breathable fabrics with broad-spectrum sunscreen.",
          "Woven Straw Accessories: A jute or wicker handbag adds organic texture to cotton and linen outfits."
        ],
        faqs: [
          {
            question: "What is the dress code for upscale cafes in Panampilly Nagar?",
            answer: "The aesthetic is smart casual and relaxed chic. Breathable natural fabrics, pastel hues, and comfortable designer flats are ideal."
          }
        ]
      }
    ];

    let insertedCount = 0;
    for (const post of initialPosts) {
      const existing = await ctx.db
        .query("blogPosts")
        .withIndex("by_slug", (q) => q.eq("slug", post.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("blogPosts", {
          ...post,
          authorId: admin._id,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        });
        insertedCount++;
      }
    }

    return { insertedCount, total: initialPosts.length };
  },
});
