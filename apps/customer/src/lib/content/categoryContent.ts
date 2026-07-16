export interface FAQ {
  question: string;
  answer: string;
}

export interface RelatedCategory {
  slug: string;
  title: string;
}

export interface CategoryContent {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  shortDescription: string;
  intro: string;
  whyHive: string[];
  faqs: FAQ[];
  relatedCategories: RelatedCategory[];
  deliveryAreas: string[];
  keywords: string[];
  heroImage?: string;
  featuredBrands?: string[];
  featuredCollections?: string[];
  seasonalContent?: string;
}

const defaultDeliveryAreas = [
  "Kakkanad",
  "Panampilly Nagar",
  "Kadavanthra",
  "Edappally",
  "Kaloor",
  "Palarivattom",
  "Vyttila",
  "Marine Drive",
];

const defaultWhyHive = [
  "Same-day delivery across Ernakulam",
  "Curated premium local boutiques",
  "Easy and hassle-free returns",
  "Secure online payments",
  "Dedicated local customer support",
];

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  women: {
    slug: "women",
    title: "Women's Fashion",
    seoTitle: "Women's Fashion in Ernakulam | Premium Boutiques",
    metaDescription: "Discover curated women's clothing from premium boutiques across Ernakulam. Shop ethnic wear, office outfits, and party collections with same-day delivery.",
    shortDescription: "Shop the best local women's fashion in Ernakulam.",
    intro: "Discover curated women's clothing from premium boutiques. Whether you're shopping for ethnic wear, office outfits, casual dresses, or party collections, Hive brings the city's best fashion stores together with fast local delivery.",
    whyHive: defaultWhyHive,
    deliveryAreas: defaultDeliveryAreas,
    keywords: ["women's fashion", "boutiques in ernakulam", "kerala fashion", "ethnic wear", "kurtis", "sarees", "lehengas"],
    faqs: [
      {
        question: "Do you offer same-day delivery in Ernakulam?",
        answer: "Yes, all orders placed before our daily cutoff are delivered on the exact same day directly from the local boutique to your doorstep in Ernakulam.",
      },
      {
        question: "Can I return women's clothing if it doesn't fit?",
        answer: "Absolutely. We offer easy, hassle-free returns. You can initiate a return directly from your Hive account within the eligible return window.",
      },
      {
        question: "Are the boutiques on Hive authentic?",
        answer: "Yes, we partner exclusively with verified, premium local boutiques across Ernakulam to guarantee the authenticity and quality of every garment.",
      },
    ],
    relatedCategories: [
      { slug: "sale", title: "Women's Sale" },
      { slug: "accessories", title: "Accessories" },
      { slug: "men", title: "Men's Fashion" },
    ],
    featuredCollections: [
      "Trending Now",
      "Office Wear",
      "Ethnic Elegance",
      "Party Wear",
      "Casual Weekend",
    ],
  },
  men: {
    slug: "men",
    title: "Men's Fashion",
    seoTitle: "Men's Fashion in Ernakulam | Shop Premium Local Stores",
    metaDescription: "Upgrade your wardrobe with premium men's fashion from Ernakulam's top boutiques. Shop shirts, trousers, and ethnic wear with same-day delivery via Hive.",
    shortDescription: "Discover premium men's clothing from Ernakulam's best stores.",
    intro: "Upgrade your wardrobe with premium men's fashion from trusted local stores. From sharp office wear and casual shirts to traditional ethnic kurtas, Hive connects you with the finest menswear boutiques in the city for a seamless shopping experience.",
    whyHive: defaultWhyHive,
    deliveryAreas: defaultDeliveryAreas,
    keywords: ["men's fashion", "menswear ernakulam", "casual shirts", "formal trousers", "ethnic wear for men"],
    faqs: [
      {
        question: "Do you offer same-day delivery in Ernakulam?",
        answer: "Yes, all orders placed before our daily cutoff are delivered on the exact same day directly from the local boutique to your doorstep in Ernakulam.",
      },
      {
        question: "What types of men's clothing are available?",
        answer: "We offer a wide selection including casual wear, formal office attire, ethnic wear, and premium activewear from top local boutiques.",
      },
    ],
    relatedCategories: [
      { slug: "women", title: "Women's Fashion" },
      { slug: "accessories", title: "Accessories" },
      { slug: "sale", title: "Sale" },
    ],
  },
  sale: {
    slug: "sale",
    title: "Clearance & Sale",
    seoTitle: "Fashion Sale in Ernakulam | Discounts on Local Boutiques",
    metaDescription: "Shop the best fashion deals and discounts from premium Ernakulam boutiques. Get same-day delivery on discounted clothing and accessories with Hive.",
    shortDescription: "The best fashion deals in Ernakulam.",
    intro: "Shop the best fashion deals and discounts from premium local boutiques. Don't compromise on quality—enjoy exclusive price drops on curated collections while stocks last, all delivered straight to your door.",
    whyHive: defaultWhyHive,
    deliveryAreas: defaultDeliveryAreas,
    keywords: ["fashion sale", "ernakulam boutique discounts", "cheap premium clothes", "discount fashion"],
    faqs: [
      {
        question: "Are sale items eligible for return?",
        answer: "Return policies on sale items depend on the specific boutique's policy. Please check the individual product page for return eligibility before purchasing.",
      },
      {
        question: "How often are new items added to the sale?",
        answer: "Our partner boutiques frequently update their clearance racks. Check back weekly for the latest markdowns on premium fashion.",
      },
    ],
    relatedCategories: [
      { slug: "women", title: "Women's Fashion" },
      { slug: "men", title: "Men's Fashion" },
      { slug: "accessories", title: "Accessories" },
    ],
  },
  accessories: {
    slug: "accessories",
    title: "Accessories",
    seoTitle: "Fashion Accessories in Ernakulam | Bags, Jewelry & More",
    metaDescription: "Complete your look with premium accessories from Ernakulam boutiques. Shop handbags, jewelry, and sunglasses with fast same-day delivery on Hive.",
    shortDescription: "Elevate your style with premium accessories.",
    intro: "Complete your look with premium accessories from Ernakulam's top boutiques. Whether you're searching for elegant jewelry, designer handbags, or chic sunglasses, find the perfect finishing touch and have it delivered today.",
    whyHive: defaultWhyHive,
    deliveryAreas: defaultDeliveryAreas,
    keywords: ["accessories ernakulam", "jewelry", "handbags", "sunglasses", "boutique accessories"],
    faqs: [
      {
        question: "Do you deliver delicate accessories safely?",
        answer: "Yes, our delivery partners ensure that all items, including delicate jewelry and structured handbags, are handled with the utmost care during transit.",
      },
    ],
    relatedCategories: [
      { slug: "women", title: "Women's Fashion" },
      { slug: "sale", title: "Sale" },
    ],
  },
};

export function getCategoryContent(slug: string): CategoryContent | null {
  return CATEGORY_CONTENT[slug.toLowerCase()] || null;
}
