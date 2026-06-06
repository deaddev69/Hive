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

export const mockCollections: Collection[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
  {
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
  },
];

/** Lookup a collection by URL slug */
export function getCollectionBySlug(slug: string): Collection | undefined {
  return mockCollections.find((c) => c.slug === slug);
}
