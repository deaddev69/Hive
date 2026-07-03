import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistProduct {
  id?: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  imageUrl: string;
  boutiqueName: string;
  rating?: number;
  reviewCount?: number;
  sizes?: string[];
  stockBySize?: Record<string, number>;
}

export interface WishlistState {
  items: WishlistProduct[];
  toggleItem: (item: WishlistProduct) => void;
  hasItem: (slug: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (item) => {
        set((state) => {
          const exists = state.items.some((i) => i.slug === item.slug);
          if (exists) {
            return {
              items: state.items.filter((i) => i.slug !== item.slug),
            };
          }
          return {
            items: [...state.items, item],
          };
        });
      },
      hasItem: (slug) => {
        return get().items.some((i) => i.slug === slug);
      },
      clearWishlist: () => set({ items: [] }),
    }),
    {
      name: "hive-wishlist-storage",
    }
  )
);
