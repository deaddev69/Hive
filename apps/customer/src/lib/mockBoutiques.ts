export interface Boutique {
  id: string;
  name: string;
  tagline: string;
  city: string;
  rating: number;
  reviewCount: number;
  specialties: string[];
  verified: boolean;
  sameDayDelivery: boolean;
  imageUrl: string;
  productCount: number;
  featured: boolean;
}

export const mockBoutiques: Boutique[] = [
  {
    id: "boutique_1",
    name: "Le Petit Atelier",
    tagline: "Finely crafted custom couture & heritage designs",
    city: "New Delhi",
    rating: 4.9,
    reviewCount: 142,
    specialties: ["Luxury Sarees", "Wedding Wear"],
    verified: true,
    sameDayDelivery: true,
    imageUrl: "https://images.unsplash.com/photo-1567401893930-7dbc069b4353?auto=format&fit=crop&w=600&q=80",
    productCount: 48,
    featured: true,
  },
  {
    id: "boutique_2",
    name: "Saffron Threads",
    tagline: "Contemporary ethnic wear for the modern woman",
    city: "Mumbai",
    rating: 4.7,
    reviewCount: 96,
    specialties: ["Designer Kurtis", "Contemporary Ethnic"],
    verified: true,
    sameDayDelivery: true,
    imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80",
    productCount: 36,
    featured: true,
  },
  {
    id: "boutique_3",
    name: "House of Aarna",
    tagline: "Exclusive bridal lehengas and festive wardrobe essentials",
    city: "Jaipur",
    rating: 4.8,
    reviewCount: 110,
    specialties: ["Wedding Wear", "Lehengas"],
    verified: true,
    sameDayDelivery: false,
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=80",
    productCount: 52,
    featured: true,
  },
  {
    id: "boutique_4",
    name: "Velvet Loom",
    tagline: "Sleek Indo-Western styles and tailored matching sets",
    city: "Bengaluru",
    rating: 4.6,
    reviewCount: 74,
    specialties: ["Indo-Western", "Co-ords"],
    verified: false,
    sameDayDelivery: true,
    imageUrl: "https://images.unsplash.com/photo-1441984969893-c53b1796834b?auto=format&fit=crop&w=600&q=80",
    productCount: 28,
    featured: true,
  },
  {
    id: "boutique_5",
    name: "The Saree Edit",
    tagline: "Curated handloom sarees from weaves across India",
    city: "Kolkata",
    rating: 4.9,
    reviewCount: 184,
    specialties: ["Luxury Sarees", "Handlooms"],
    verified: true,
    sameDayDelivery: true,
    imageUrl: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80",
    productCount: 64,
    featured: true,
  },
  {
    id: "boutique_6",
    name: "Studio Noor",
    tagline: "Elegant handcrafted suits and luxury dupattas",
    city: "Lucknow",
    rating: 4.5,
    reviewCount: 52,
    specialties: ["Contemporary Ethnic", "Designer Suits"],
    verified: false,
    sameDayDelivery: false,
    imageUrl: "https://images.unsplash.com/photo-1537832816519-689ad163238b?auto=format&fit=crop&w=600&q=80",
    productCount: 22,
    featured: true,
  },
];
