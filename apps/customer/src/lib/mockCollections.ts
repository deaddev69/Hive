export interface Collection {
  slug: string;
  title: string;
  label: string; // matches occasion ID in mockProducts
  icon: string;
  description: string;
  longDescription: string;
  imageUrl: string;
  productCount: number;
  isFeatured?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionDetails — rich editorial data for the collection experience page.
// Consumed by CollectionHero, CollectionStats, CollectionShowcase.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeaturedBoutiqueRef {
  id: string;
  name: string;
  imageUrl: string;
  verified: boolean;
}

export interface FeaturedProductRef {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  boutiqueName: string;
}

export interface CollectionDetails extends Collection {
  /** Short marketing subtitle shown in hero */
  subtitle: string;
  /** Full editorial copy */
  editorialCopy: string;
  /** Accent hex color — used for subtle tints */
  accentColor: string;
  /** Cover image — widescreen, 16:9 */
  coverImageUrl: string;
  /** Stats */
  stats: {
    productCount: number;
    boutiqueCount: number;
    sameDayEligible: number;
    averageRating: number;
  };
  featuredBoutiques: FeaturedBoutiqueRef[];
  featuredProducts: FeaturedProductRef[];
  /** Editorial tags shown as chips */
  tags: string[];
}

export const collectionDetails: Record<string, CollectionDetails> = {
  wedding: {
    slug: "wedding",
    title: "Wedding Guest",
    label: "wedding",
    icon: "💍",
    description: "Curated ensembles for your most special occasions.",
    longDescription:
      "From hand-embroidered lehengas to silk sarees with zardozi work, our wedding guest collection is crafted for celebrations where every detail matters.",
    imageUrl:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80",
    productCount: 34,
    isFeatured: true,
    subtitle: "Dress the part. Own the celebration.",
    editorialCopy:
      "Every wedding is a story. Be the chapter that lingers. From rich zardozi lehengas to drape-perfect silk sarees — our Wedding Guest edit is for the woman who refuses to blend in.",
    accentColor: "#C9A84C",
    coverImageUrl:
      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 34, boutiqueCount: 5, sameDayEligible: 22, averageRating: 4.8 },
    featuredBoutiques: [
      { id: "boutique_1", name: "Le Petit Atelier", imageUrl: "https://images.unsplash.com/photo-1567401893930-7dbc069b4353?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_3", name: "House of Aarna", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_5", name: "The Saree Edit", imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80", verified: true },
    ],
    featuredProducts: [
      { id: "prod_1", name: "Varanasi Silk Katan Saree", imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80", price: 12499, boutiqueName: "Zari & Loom" },
      { id: "prod_2", name: "Crimson Rose Embroidered Lehenga", imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80", price: 24999, boutiqueName: "Chanderi House" },
    ],
    tags: ["Silk", "Zardozi", "Lehenga", "Saree", "Handloom"],
  },

  festival: {
    slug: "festival",
    title: "Festival",
    label: "festival",
    icon: "🎉",
    description: "Bold, celebratory, and rooted in tradition.",
    longDescription:
      "Handloom silks, block-printed dupattas, and radiant kurta sets — made to stand out during every festive gathering.",
    imageUrl:
      "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80",
    productCount: 28,
    isFeatured: true,
    subtitle: "Celebrate in color. Stand in tradition.",
    editorialCopy:
      "Festivals are not just occasions — they are declarations of joy. Hive's Festival edit brings together radiant kurta sets, hand-block printed dupattas, and handloom silks that speak the language of celebration.",
    accentColor: "#E67E22",
    coverImageUrl:
      "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 28, boutiqueCount: 4, sameDayEligible: 16, averageRating: 4.7 },
    featuredBoutiques: [
      { id: "boutique_2", name: "Saffron Threads", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_5", name: "The Saree Edit", imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80", verified: true },
    ],
    featuredProducts: [
      { id: "prod_7", name: "Mulberry Handloom Silk Saree", imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=400&q=80", price: 14500, boutiqueName: "Zari & Loom" },
    ],
    tags: ["Block Print", "Handloom", "Festive", "Kurta Set", "Dupatta"],
  },

  workwear: {
    slug: "workwear",
    title: "Work Wear",
    label: "workwear",
    icon: "💼",
    description: "Professional with a craft-forward edge.",
    longDescription:
      "Structured kurta sets and tailored co-ords that carry artisan craftsmanship into the boardroom without compromise.",
    imageUrl:
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80",
    productCount: 19,
    subtitle: "Craft, not corporate.",
    editorialCopy:
      "The modern professional wears her craft with pride. Structured silhouettes, subtle embroideries, and impeccable tailoring from boutiques that understand that workwear can still have a story.",
    accentColor: "#4A6FA5",
    coverImageUrl:
      "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 19, boutiqueCount: 3, sameDayEligible: 12, averageRating: 4.5 },
    featuredBoutiques: [
      { id: "boutique_4", name: "Velvet Loom", imageUrl: "https://images.unsplash.com/photo-1441984969893-c53b1796834b?auto=format&fit=crop&w=300&q=80", verified: false },
      { id: "boutique_6", name: "Studio Noor", imageUrl: "https://images.unsplash.com/photo-1537832816519-689ad163238b?auto=format&fit=crop&w=300&q=80", verified: false },
    ],
    featuredProducts: [
      { id: "prod_6", name: "Pastel Pink Chikankari Palazzo Suit", imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80", price: 5499, boutiqueName: "Awadh Handlooms" },
    ],
    tags: ["Kurta Set", "Co-ords", "Tailored", "Chikankari", "Linen"],
  },

  party: {
    slug: "party",
    title: "Party Night",
    label: "party",
    icon: "🥂",
    description: "Evening wear that commands attention.",
    longDescription:
      "Sequin sarees, plunge-neck gowns, and statement fusion silhouettes for nights that deserve to be remembered.",
    imageUrl:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80",
    productCount: 22,
    isFeatured: true,
    subtitle: "Arrive. Captivate. Linger.",
    editorialCopy:
      "Some nights call for more. Our Party Night edit is for the woman who doesn't need to try to be noticed — she simply arrives. Sequin drapes, velvet gowns, and statement co-ords from boutiques that know how to make a moment.",
    accentColor: "#8E44AD",
    coverImageUrl:
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 22, boutiqueCount: 4, sameDayEligible: 14, averageRating: 4.8 },
    featuredBoutiques: [
      { id: "boutique_1", name: "Le Petit Atelier", imageUrl: "https://images.unsplash.com/photo-1567401893930-7dbc069b4353?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_3", name: "House of Aarna", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80", verified: true },
    ],
    featuredProducts: [
      { id: "prod_2", name: "Crimson Rose Embroidered Lehenga", imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=400&q=80", price: 24999, boutiqueName: "Chanderi House" },
    ],
    tags: ["Sequin", "Velvet", "Evening Gown", "Fusion", "Statement"],
  },

  casual: {
    slug: "casual",
    title: "Casual Day",
    label: "casual",
    icon: "☀️",
    description: "Effortless looks for everyday living.",
    longDescription:
      "Breathable cotton, relaxed palazzo suits, and breezy sundresses from local boutiques designed for the leisurely side of style.",
    imageUrl:
      "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?auto=format&fit=crop&w=800&q=80",
    productCount: 41,
    subtitle: "Ease into the day. Beautifully.",
    editorialCopy:
      "The best outfit is one you forget you're wearing. Our Casual Day edit is comfort elevated — breathable handlooms, relaxed palazzos, and airy printed sets from boutiques who understand that everyday dressing can still feel special.",
    accentColor: "#27AE60",
    coverImageUrl:
      "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 41, boutiqueCount: 6, sameDayEligible: 28, averageRating: 4.6 },
    featuredBoutiques: [
      { id: "boutique_2", name: "Saffron Threads", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_4", name: "Velvet Loom", imageUrl: "https://images.unsplash.com/photo-1441984969893-c53b1796834b?auto=format&fit=crop&w=300&q=80", verified: false },
    ],
    featuredProducts: [
      { id: "prod_8", name: "Royal Indigo Hand-Block Print Maxi", imageUrl: "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?auto=format&fit=crop&w=400&q=80", price: 3890, boutiqueName: "Indigo Jaipur" },
      { id: "prod_6", name: "Pastel Pink Chikankari Palazzo Suit", imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=400&q=80", price: 5499, boutiqueName: "Awadh Handlooms" },
    ],
    tags: ["Cotton", "Palazzo", "Block Print", "Breathable", "Handloom"],
  },

  date: {
    slug: "date",
    title: "Date Night",
    label: "date",
    icon: "🌹",
    description: "Intimate elegance for moments that matter.",
    longDescription:
      "Silk midi dresses, delicate embroidery, and thoughtfully draped silhouettes that speak without trying.",
    imageUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
    productCount: 17,
    subtitle: "Quiet luxury. Unmistakable presence.",
    editorialCopy:
      "The most powerful thing you can wear is intention. Date Night at Hive is an edit of pieces that feel personal — silk drapes, hand-embroidered blouses, and quietly luxurious silhouettes from boutiques that craft for intimate moments.",
    accentColor: "#C0392B",
    coverImageUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 17, boutiqueCount: 3, sameDayEligible: 10, averageRating: 4.8 },
    featuredBoutiques: [
      { id: "boutique_1", name: "Le Petit Atelier", imageUrl: "https://images.unsplash.com/photo-1567401893930-7dbc069b4353?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_5", name: "The Saree Edit", imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80", verified: true },
    ],
    featuredProducts: [
      { id: "prod_5", name: "Silk Bandhani Tie-Dye Midi Dress", imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=400&q=80", price: 6800, boutiqueName: "Brocade & Co" },
    ],
    tags: ["Silk", "Embroidery", "Midi", "Drape", "Intimate"],
  },

  ethnic: {
    slug: "ethnic",
    title: "Ethnic",
    label: "ethnic",
    icon: "🪔",
    description: "Heritage weaves, handcrafted for today.",
    longDescription:
      "Anarkali sets, handloom dupattas, and jamdani sarees that carry forward generations of craftsmanship from India's finest weaving traditions.",
    imageUrl:
      "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=800&q=80",
    productCount: 38,
    subtitle: "Roots never looked so relevant.",
    editorialCopy:
      "Tradition is not a limitation — it is a foundation. Our Ethnic edit is a carefully chosen archive of India's finest weaving traditions: Jamdani, Kanjivaram, Banarasi, Chikankari — interpreted by boutiques that honour the craft while dressing the now.",
    accentColor: "#D35400",
    coverImageUrl:
      "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 38, boutiqueCount: 5, sameDayEligible: 20, averageRating: 4.7 },
    featuredBoutiques: [
      { id: "boutique_5", name: "The Saree Edit", imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=300&q=80", verified: true },
      { id: "boutique_6", name: "Studio Noor", imageUrl: "https://images.unsplash.com/photo-1537832816519-689ad163238b?auto=format&fit=crop&w=300&q=80", verified: false },
    ],
    featuredProducts: [
      { id: "prod_3", name: "Emerald Hand-Painted Anarkali Kurti", imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=400&q=80", price: 3499, boutiqueName: "Odhni Couture" },
    ],
    tags: ["Jamdani", "Anarkali", "Banarasi", "Chikankari", "Heritage"],
  },

  coords: {
    slug: "coords",
    title: "Co-ords",
    label: "coords",
    icon: "✨",
    description: "Matching sets. Maximum impact.",
    longDescription:
      "Artisan-crafted co-ordinate sets in linen, silk, and printed cotton — where the top already knows its partner.",
    imageUrl:
      "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80",
    productCount: 15,
    subtitle: "Two pieces. One statement.",
    editorialCopy:
      "The most decisive dressing decision you'll ever make: when the top and bottom already agree. Hive's Co-ords edit features artisan-crafted matching sets in linen, printed cotton, and silk — because effortless should still feel intentional.",
    accentColor: "#1ABC9C",
    coverImageUrl:
      "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1600&q=80",
    stats: { productCount: 15, boutiqueCount: 3, sameDayEligible: 8, averageRating: 4.6 },
    featuredBoutiques: [
      { id: "boutique_4", name: "Velvet Loom", imageUrl: "https://images.unsplash.com/photo-1441984969893-c53b1796834b?auto=format&fit=crop&w=300&q=80", verified: false },
      { id: "boutique_2", name: "Saffron Threads", imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=300&q=80", verified: true },
    ],
    featuredProducts: [
      { id: "prod_4", name: "Saffron Linen Wide-Leg Co-ord Set", imageUrl: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=400&q=80", price: 4299, boutiqueName: "Stitch Studio" },
    ],
    tags: ["Linen", "Printed Cotton", "Silk", "Matching Set", "Artisan"],
  },
};

export const mockCollections: Collection[] = Object.values(collectionDetails);

/** Lookup a collection by URL slug */
export function getCollectionBySlug(slug: string): Collection | undefined {
  return mockCollections.find((c) => c.slug === slug);
}

/** Lookup full CollectionDetails by URL slug */
export function getCollectionDetails(slug: string): CollectionDetails | undefined {
  return collectionDetails[slug];
}
