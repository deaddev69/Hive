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
