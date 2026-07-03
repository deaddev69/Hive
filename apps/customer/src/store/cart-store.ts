import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
  price: number; // in paise
  name: string;
  imageUrl: string;
  boutiqueName: string;
  boutiqueId?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number; // returns total in paise
  getCartCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => {
        const quantity = newItem.quantity ?? 1;
        set((state) => {
          const existing = state.items.find(
            (item) => item.productId === newItem.productId && item.size === newItem.size
          );
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === newItem.productId && item.size === newItem.size
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity,
              },
            ],
          };
        });
      },
      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.productId === productId && item.size === size)
          ),
        }));
      },
      updateQuantity: (productId, size, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) => !(item.productId === productId && item.size === size)
              ),
            };
          }
          return {
            items: state.items.map((item) =>
              item.productId === productId && item.size === size
                ? { ...item, quantity }
                : item
            ),
          };
        });
      },
      clearCart: () => {
        set({ items: [] });
      },
      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      getCartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: "hive-cart-storage",
    }
  )
);
