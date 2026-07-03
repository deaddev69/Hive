// convex/seedMutations.ts
// Mutations for seeding mock database with rich QA test data.

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const insertMockData = mutation({
  args: { categoryImageIds: v.record(v.string(), v.string()) },
  handler: async (ctx, args) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Seeding mock database is disabled in this environment.");
    }
    const now = Date.now();

    // 1. Clean up existing boutiques, products, categories, zones, pincodes, and configs
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) {
      await ctx.db.delete(p._id);
    }

    const existingBoutiques = await ctx.db.query("boutiques").collect();
    for (const b of existingBoutiques) {
      await ctx.db.delete(b._id);
    }

    const existingCats = await ctx.db.query("categories").collect();
    for (const c of existingCats) {
      await ctx.db.delete(c._id);
    }

    const existingZones = await ctx.db.query("deliveryZones").collect();
    for (const z of existingZones) {
      await ctx.db.delete(z._id);
    }

    const existingPincodes = await ctx.db.query("serviceablePincodes").collect();
    for (const p of existingPincodes) {
      await ctx.db.delete(p._id);
    }

    const existingConfigs = await ctx.db.query("homepageConfig").collect();
    for (const c of existingConfigs) {
      await ctx.db.delete(c._id);
    }

    const existingBanners = await ctx.db.query("homepageBanners").collect();
    for (const b of existingBanners) {
      await ctx.db.delete(b._id);
    }

    // 2. Seed deliveryZones
    const zonesData = [
      { code: "KOCHI_CORE", name: "Kochi Core Area", deliveryFeePaise: 4900, freeDeliveryThresholdPaise: 300000, sameDayEligible: true, active: true },
      { code: "KOCHI_EXTENDED", name: "Kochi Extended Area", deliveryFeePaise: 9900, freeDeliveryThresholdPaise: 350000, sameDayEligible: true, active: true },
      { code: "THRISSUR_CORE", name: "Thrissur Core Area", deliveryFeePaise: 5900, freeDeliveryThresholdPaise: 250000, sameDayEligible: false, active: true }
    ];
    for (const z of zonesData) {
      await ctx.db.insert("deliveryZones", z);
    }

    // 3. Seed serviceablePincodes
    const pincodesData = [
      { pincode: "682020", city: "Kochi", state: "Kerala", lat: 9.966, lng: 76.28, active: true, zoneCode: "KOCHI_CORE" },
      { pincode: "682011", city: "Ernakulam", state: "Kerala", lat: 9.9723, lng: 76.2778, active: true, zoneCode: "KOCHI_CORE" },
      { pincode: "682030", city: "Kochi", state: "Kerala", lat: 10.0159, lng: 76.3419, active: true, zoneCode: "KOCHI_EXTENDED" },
      { pincode: "682025", city: "Kochi", state: "Kerala", lat: 9.9592, lng: 76.2928, active: true, zoneCode: "KOCHI_CORE" },
      { pincode: "682024", city: "Kochi", state: "Kerala", lat: 10.0261, lng: 76.3088, active: true, zoneCode: "KOCHI_CORE" },
      { pincode: "682019", city: "Kochi", state: "Kerala", lat: 9.9704, lng: 76.3197, active: true, zoneCode: "KOCHI_CORE" }
    ];
    for (const p of pincodesData) {
      await ctx.db.insert("serviceablePincodes", p);
    }

    // 4. Seed categories with parent-child structure
    const parents = [
      { name: "Women's Ethnic", slug: "womens-ethnic", sortOrder: 1 },
      { name: "Jewellery", slug: "jewellery-top", sortOrder: 2 },
      { name: "Home Decor", slug: "home-top", sortOrder: 3 },
    ];

    const parentIds: Record<string, any> = {};
    for (const p of parents) {
      const id = await ctx.db.insert("categories", {
        name: p.name,
        slug: p.slug,
        active: true,
        sortOrder: p.sortOrder,
        createdAt: now,
      });
      parentIds[p.slug] = id;
    }

    const subcats = [
      { name: "Sarees", slug: "sarees", parentSlug: "womens-ethnic", sortOrder: 1, showOnHomepage: true, icon: "Sarees" },
      { name: "Lehengas", slug: "lehengas", parentSlug: "womens-ethnic", sortOrder: 2, showOnHomepage: true, icon: "Lehengas" },
      { name: "Kurtis", slug: "kurtis", parentSlug: "womens-ethnic", sortOrder: 3, showOnHomepage: true, icon: "Kurtis" },
      { name: "Salwar Sets", slug: "salwar-sets", parentSlug: "womens-ethnic", sortOrder: 4, showOnHomepage: true, icon: "Salwar Sets" },
      { name: "Jewellery", slug: "jewellery", parentSlug: "jewellery-top", sortOrder: 5, showOnHomepage: true, icon: "Jewellery" },
      { name: "Home Decor", slug: "home", parentSlug: "home-top", sortOrder: 6, showOnHomepage: true, icon: "Home" }
    ];

    const categoryIds: Record<string, any> = {};
    for (const sub of subcats) {
      const imageStorageId = (args.categoryImageIds[sub.slug] || "") as any;
      const id = await ctx.db.insert("categories", {
        name: sub.name,
        slug: sub.slug,
        imageStorageId,
        active: true,
        sortOrder: sub.sortOrder,
        showOnHomepage: sub.showOnHomepage,
        homepageOrder: sub.sortOrder,
        icon: sub.icon,
        parentId: parentIds[sub.parentSlug],
        createdAt: now,
      });
      categoryIds[sub.slug] = id;
    }

    // 5. Seed default homepageConfig
    const subcatIds = Object.values(categoryIds);
    await ctx.db.insert("homepageConfig", {
      activeHeroBannerIds: [],
      featuredCategoryIds: subcatIds,
      featuredBoutiqueIds: [],
      enableOccasionSection: true,
      enableMostLovedSection: true,
      updatedAt: now,
    });

    // 3. Define 10 distinct boutiques with variable delivery radii, statuses, and delivery fees
    const boutiquesData = [
      {
        boutiqueName: "Kochi Threads",
        ownerName: "Rohan Kurian",
        email: "rohan@kochithreads.com",
        phone: "+919876543212",
        address: "MG Road, Kochi, Kerala",
        latitude: 9.9723,
        longitude: 76.2778,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Authentic Kerala Kasavu sarees and custom designer outfits.",
        status: "APPROVED",
        ownerEmail: "rohan@kochithreads.com",
      },
      {
        boutiqueName: "Malabar Silks",
        ownerName: "Priya Menon",
        email: "priya@malabarsilks.com",
        phone: "+919876543213",
        address: "Panampilly Nagar, Kochi, Kerala",
        latitude: 9.9592,
        longitude: 76.2928,
        deliveryRadiusKm: 15,
        deliveryFee: 99,
        freeDeliveryThreshold: 3000,
        description: "Premium handwoven silk sarees and designer brocades.",
        status: "APPROVED",
        ownerEmail: "priya@malabarsilks.com",
      },
      {
        boutiqueName: "Cochin Couture",
        ownerName: "Ananya Lal",
        email: "ananya@cochincouture.com",
        phone: "+919876543214",
        address: "Edappally, Kochi, Kerala",
        latitude: 10.0261,
        longitude: 76.3088,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Elegant modern bridal lehengas and wedding wear.",
        status: "APPROVED",
        ownerEmail: "ananya@cochincouture.com",
      },
      {
        boutiqueName: "Vypeen Weaves",
        ownerName: "Thomas Varghese",
        email: "thomas@vypeenweaves.com",
        phone: "+919876543215",
        address: "Fort Kochi, Kerala",
        latitude: 9.9658,
        longitude: 76.2421,
        deliveryRadiusKm: 3, // Tight local zone
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Fine handloom cotton apparel and sustainable linen garments.",
        status: "APPROVED",
        ownerEmail: "thomas@vypeenweaves.com",
      },
      {
        boutiqueName: "Kakkanad Designer Hub",
        ownerName: "Siddharth Nair",
        email: "sid@designerhub.com",
        phone: "+919876543216",
        address: "Kakkanad, Kochi, Kerala",
        latitude: 10.0159,
        longitude: 76.3419,
        deliveryRadiusKm: 5, // Mid-range zone
        deliveryFee: 99,
        freeDeliveryThreshold: 3000,
        description: "Contemporary ethnic wear and smart daily wear kurtis.",
        status: "APPROVED",
        ownerEmail: "sid@designerhub.com",
      },
      {
        boutiqueName: "Vytilla Fashion Villa",
        ownerName: "Meera Jacob",
        email: "meera@fashionvilla.com",
        phone: "+919876543217",
        address: "Vytilla, Kochi, Kerala",
        latitude: 9.9704,
        longitude: 76.3197,
        deliveryRadiusKm: 15,
        deliveryFee: 99,
        freeDeliveryThreshold: 3000,
        description: "Bespoke designer salwar suits and casual georgette ensembles.",
        status: "APPROVED",
        ownerEmail: "meera@fashionvilla.com",
      },
      {
        boutiqueName: "Palarivattom Threads",
        ownerName: "Deepa Raj",
        email: "deepa@palarivattomthreads.com",
        phone: "+919876543218",
        address: "Palarivattom, Kochi, Kerala",
        latitude: 10.0056,
        longitude: 76.3075,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Custom stitching services and embroidered party wear.",
        status: "APPROVED",
        ownerEmail: "deepa@palarivattomthreads.com",
      },
      {
        boutiqueName: "Tripunithura Heritage",
        ownerName: "Radha Verma",
        email: "radha@heritage.com",
        phone: "+919876543219",
        address: "Tripunithura, Kochi, Kerala",
        latitude: 9.9489,
        longitude: 76.3431,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Traditional Kerala ethnic clothing and custom alterations.",
        status: "PENDING", // PENDING Approval QA testing
        ownerEmail: "radha@heritage.com",
      },
      {
        boutiqueName: "Kadavanthra Apparels",
        ownerName: "Harish Pillai",
        email: "harish@kadavanthra.com",
        phone: "+919876543220",
        address: "Kadavanthra, Kochi, Kerala",
        latitude: 9.9669,
        longitude: 76.2995,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Modern fusion wear and designer tunics.",
        status: "SUSPENDED", // SUSPENDED QA testing
        ownerEmail: "harish@kadavanthra.com",
      },
      {
        boutiqueName: "Aluva Handlooms",
        ownerName: "Vikram Sen",
        email: "vikram@aluva.com",
        phone: "+919876543221",
        address: "Aluva, Kochi, Kerala",
        latitude: 10.1076,
        longitude: 76.3457,
        deliveryRadiusKm: 15,
        deliveryFee: 49,
        freeDeliveryThreshold: 3000,
        description: "Pure cotton block print collections and handlooms.",
        status: "REJECTED", // REJECTED QA testing & 0 products check
        ownerEmail: "vikram@aluva.com",
      }
    ];

    const boutiqueIds: Record<string, any> = {};
    for (const b of boutiquesData) {
      const id = await ctx.db.insert("boutiques", {
        ...b,
        createdAt: now,
      });
      boutiqueIds[b.boutiqueName] = id;
    }

    // 3b. Seed default homepageBanners
    await ctx.db.insert("homepageBanners", {
      title: "Wedding Season",
      subtitle: "Up to 30% OFF",
      desktopImageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
      ctaText: "Shop Now",
      active: true,
      displayOrder: 1,
      targetType: "collection",
      targetValue: "wedding",
      city: "Ernakulam",
      createdAt: now,
    });

    await ctx.db.insert("homepageBanners", {
      title: "Designer Sarees",
      subtitle: "New drops landing daily",
      desktopImageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
      ctaText: "Explore",
      active: true,
      displayOrder: 2,
      targetType: "category",
      targetValue: "sarees",
      city: "Ernakulam",
      createdAt: now,
    });

    await ctx.db.insert("homepageBanners", {
      title: "Handwoven Silk Sarees",
      subtitle: "Promoting local styles",
      desktopImageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
      mobileImageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
      ctaText: "Shop Collection",
      active: true,
      displayOrder: 3,
      targetType: "product",
      targetValue: boutiqueIds["Kochi Threads"] || "",
      createdAt: now,
    });

    // 4. Set up Product Templates per category
    const templates = {
      sarees: {
        name: "Premium Kasavu Saree",
        desc: "Exquisite handloom cotton saree featuring a detailed golden borders, perfect for traditional festivals.",
        img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        sizes: ["Free"]
      },
      lehengas: {
        name: "Designer Silk Lehenga",
        desc: "Stunning silk lehenga detailed with heavy floral motifs and a contrasting net dupatta.",
        img: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800",
        sizes: ["S", "M", "L"]
      },
      kurtis: {
        name: "Cotton Block Print Kurti",
        desc: "Comfortable daily wear A-line cotton kurti with block print patterns, extremely breathable.",
        img: "https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&q=80&w=800",
        sizes: ["S", "M", "L", "XL"]
      },
      "salwar-sets": {
        name: "Chanderi Embroidered Suit Set",
        desc: "Elegant Chanderi silk salwar suit with minimal neckline embroidery and solid pencil pants.",
        img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
        sizes: ["M", "L", "XL"]
      }
    };

    // 5. Generate exactly 100 products distributed across boutiques 1 to 9 (Boutique 10 is left with 0 products)
    // 12 products for Boutique 1, 11 products each for Boutiques 2 to 9. Total = 12 + (8 * 11) = 100 products.
    let productsSeeded = 0;

    for (let index = 0; index < 100; index++) {
      // Determine boutique assignment
      let boutiqueName = "";
      if (index < 12) {
        boutiqueName = boutiquesData[0]!.boutiqueName; // Boutique 1 (Kochi Threads)
      } else {
        const boutiqueIdx = 1 + Math.floor((index - 12) / 11); // Boutiques 2 to 9 (indices 1 to 8)
        boutiqueName = boutiquesData[boutiqueIdx]!.boutiqueName;
      }

      // Determine price based on index (QA specific price band distribution)
      let price = 1500;
      if (index < 30) {
        // 30 products priced ₹799–1499
        price = 799 + (index * 23) % 700;
      } else if (index < 70) {
        // 40 products priced ₹1500–2999
        price = 1500 + (index * 37) % 1500;
      } else if (index < 90) {
        // 20 products priced ₹3000–5999
        price = 3000 + (index * 131) % 3000;
      } else {
        // 10 products priced ₹6000–12000
        price = 6000 + (index * 599) % 6000;
      }

      // Determine category (cycle through categories)
      const categoriesKeys = ["sarees", "lehengas", "kurtis", "salwar-sets"] as const;
      const categorySlug = categoriesKeys[index % 4]!;
      const template = templates[categorySlug]!;

      // Custom attributes for specific indices (Inventory & Media Edge Cases)
      let name = `${template.name} - ${boutiqueName.split(" ")[0]} #${index}`;
      let description = template.desc;
      let sizes = template.sizes;
      let stockBySize: Record<string, number> = {};
      let active = true;

      // Base premium content tailored to categories to avoid placeholder test values
      let material = "100% Premium Pure Handcrafted Cotton";
      let care = "Dry clean only. Iron on reverse low heat.";
      let origin = "Handcrafted in Kerala, India";
      let story = "Inspired by the local handloom weavers of Kochi, this piece is designed with pure grace and tradition in mind.";

      if (categorySlug === "sarees") {
        material = price > 5000 ? "Pure Varanasi Katan Silk" : "Premium Handloom Kasavu Cotton";
        care = "Dry clean only. Store in a soft cotton storage pouch.";
        origin = price > 5000 ? "Woven in Varanasi, Uttar Pradesh" : "Hand-loomed in Kochi, Kerala";
        story = "A beautiful celebration of Indian heritage, showcasing fine gold zari borders and a lightweight traditional drape.";
      } else if (categorySlug === "lehengas") {
        material = "Premium Silk Velvet & Organza Dupatta";
        care = "Dry clean only. Keep stored on a padded hanger.";
        origin = "Crafted in Jaipur, Rajasthan";
        story = "A statement wedding piece, designed with heavy floral motifs, double-cancan structure, and gold border overlays.";
      } else if (categorySlug === "kurtis") {
        material = "100% Organic Breathable Cotton";
        care = "Gentle hand wash with mild detergent. Line dry in shade.";
        origin = "Hand-printed in Aluva, Kerala";
        story = "A daily wear essential crafted from breathable local handloom cotton with artisan-applied block prints.";
      } else if (categorySlug === "salwar-sets") {
        material = "Pure Chanderi Silk & Solid Cotton Pants";
        care = "Dry clean recommended. Warm iron on reverse side.";
        origin = "Handcrafted in Lucknow, Uttar Pradesh";
        story = "An elegant classic salwar suit detailed with minimal neckline embroidery and structured pencil pants.";
      }

      let measurementMatrix = [
        { size: "S", chest: "36", waist: "32", shoulder: "14", length: "42" },
        { size: "M", chest: "38", waist: "34", shoulder: "14.5", length: "42.5" },
        { size: "L", chest: "40", waist: "36", shoulder: "15", length: "43" }
      ];
      let images = [
        template.img,
        "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=800"
      ];

      // Introduce some lower quality products (e.g. index % 7 === 0) for testing/gating UI
      const isTestLowQuality = index % 7 === 0;
      if (isTestLowQuality) {
        images = [template.img]; // 1 image only
        material = "";
        care = "";
        origin = "";
        story = "";
        measurementMatrix = [];
      }

      // Build default stock
      for (const size of sizes) {
        stockBySize[size] = 5;
      }

      // Boutique 1 specific edge cases
      if (index === 0) {
        name = "Traditional Kasavu Saree (Out of Stock)";
        stockBySize = { "Free": 0 };
      } else if (index === 1) {
        name = "Kasavu Borders Kurti (Limited Stock)";
        stockBySize = { "S": 1 };
      } else if (index === 2) {
        name = "Deactivated Linen Salwar Suit";
        active = false;
      } else if (index === 11) {
        name = "Kasavu Brocade Lehenga (No Image)";
        images = [];
      }

      // Generate unique slug with robust regex deduplication
      const cleanBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const boutiqueWord = boutiqueName.toLowerCase().split(" ")[0] || "";
      
      let slug = cleanBase;
      if (boutiqueWord) {
        const hasBoutiqueSuffix = new RegExp(`-${boutiqueWord}(-${index})?$`).test(cleanBase);
        if (!hasBoutiqueSuffix) {
          slug = `${slug}-${boutiqueWord}`;
        }
      }
      
      const indexSuffix = `-${index}`;
      if (!slug.endsWith(indexSuffix)) {
        slug = `${slug}-${index}`;
      }
      
      slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");

      await ctx.db.insert("products", {
        boutiqueId: boutiqueIds[boutiqueName]!,
        name,
        slug,
        description,
        categoryId: categoryIds[categorySlug]!,
        price,
        discountPrice: index % 5 === 0 ? Math.round(price * 0.9) : undefined, // 10% off for every 5th product
        images,
        sizes,
        stockBySize,
        sameDayEligible: index % 2 === 0, // 50% eligible for same day delivery
        featured: index % 3 === 0,
        active,
        material: material || undefined,
        care: care || undefined,
        origin: origin || undefined,
        story: story || undefined,
        measurementMatrix: measurementMatrix.length > 0 ? measurementMatrix : undefined,
        createdAt: now,
        updatedAt: now,
      });

      productsSeeded++;
    }

    return {
      success: true,
      seededBoutiques: boutiquesData.length,
      seededProducts: productsSeeded,
    };
  },
});
