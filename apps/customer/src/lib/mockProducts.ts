export interface ProductCardData {
  id: string;
  name: string;
  boutiqueName: string;
  imageUrl: string;
  price: number;
  compareAtPrice?: number;
  rating?: number;
  reviewCount?: number;
  occasion?: string;
  isVerifiedBoutique?: boolean;
  isNewArrival?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  sameDayDelivery?: boolean;
  videoAvailable?: boolean;
  favorite?: boolean;
}

export const mockProducts: ProductCardData[] = [
  {
    id: "prod_1",
    name: "Varanasi Silk Katan Saree",
    boutiqueName: "Zari & Loom",
    imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
    price: 12499,
    compareAtPrice: 16500,
    rating: 4.9,
    reviewCount: 42,
    occasion: "wedding",
    isVerifiedBoutique: true,
    isBestSeller: true,
    sameDayDelivery: true,
    videoAvailable: true,
    favorite: false,
  },
  {
    id: "prod_2",
    name: "Crimson Rose Embroidered Lehenga",
    boutiqueName: "Chanderi House",
    imageUrl: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80",
    price: 24999,
    compareAtPrice: 32000,
    rating: 4.8,
    reviewCount: 18,
    occasion: "wedding",
    isVerifiedBoutique: true,
    isNewArrival: true,
    sameDayDelivery: true,
    videoAvailable: false,
    favorite: true,
  },
  {
    id: "prod_3",
    name: "Emerald Hand-Painted Anarkali Kurti",
    boutiqueName: "Odhni Couture",
    imageUrl: "https://images.unsplash.com/photo-1596783074918-c84cb06531ca?auto=format&fit=crop&w=600&q=80",
    price: 3499,
    compareAtPrice: 4999,
    rating: 4.7,
    reviewCount: 88,
    occasion: "ethnic",
    isVerifiedBoutique: false,
    isTrending: true,
    sameDayDelivery: true,
    videoAvailable: true,
    favorite: false,
  },
  {
    id: "prod_4",
    name: "Saffron Linen Wide-Leg Co-ord Set",
    boutiqueName: "Stitch Studio",
    imageUrl: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=600&q=80",
    price: 4299,
    compareAtPrice: 5500,
    rating: 4.6,
    reviewCount: 31,
    occasion: "coords",
    isVerifiedBoutique: true,
    isNewArrival: true,
    sameDayDelivery: false,
    videoAvailable: false,
    favorite: false,
  },
  {
    id: "prod_5",
    name: "Silk Bandhani Tie-Dye Midi Dress",
    boutiqueName: "Brocade & Co",
    imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
    price: 6800,
    compareAtPrice: 8500,
    rating: 4.8,
    reviewCount: 15,
    occasion: "date",
    isVerifiedBoutique: true,
    isTrending: true,
    sameDayDelivery: true,
    videoAvailable: true,
    favorite: false,
  },
  {
    id: "prod_6",
    name: "Pastel Pink Chikankari Palazzo Suit",
    boutiqueName: "Awadh Handlooms",
    imageUrl: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
    price: 5499,
    compareAtPrice: 6999,
    rating: 4.5,
    reviewCount: 56,
    occasion: "casual",
    isVerifiedBoutique: false,
    isBestSeller: true,
    sameDayDelivery: true,
    videoAvailable: false,
    favorite: false,
  },
  {
    id: "prod_7",
    name: "Mulberry Handloom Silk Saree",
    boutiqueName: "Zari & Loom",
    imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=600&q=80",
    price: 14500,
    compareAtPrice: 19000,
    rating: 4.9,
    reviewCount: 22,
    occasion: "festival",
    isVerifiedBoutique: true,
    isNewArrival: true,
    sameDayDelivery: false,
    videoAvailable: true,
    favorite: false,
  },
  {
    id: "prod_8",
    name: "Royal Indigo Hand-Block Print Maxi",
    boutiqueName: "Indigo Jaipur",
    imageUrl: "https://images.unsplash.com/photo-1561414927-6d86591d0c4f?auto=format&fit=crop&w=600&q=80",
    price: 3890,
    compareAtPrice: 4500,
    rating: 4.6,
    reviewCount: 112,
    occasion: "casual",
    isVerifiedBoutique: true,
    isTrending: true,
    sameDayDelivery: true,
    videoAvailable: false,
    favorite: true,
  },
];
