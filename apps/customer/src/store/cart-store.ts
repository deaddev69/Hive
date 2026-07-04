import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  size: string;
  quantity: number;
  availableStock?: number;
  price: number; // in rupees
  name: string;
  imageUrl: string;
  boutiqueName: string;
  boutiqueId?: string;
  isPreorder?: boolean;
  preorderType?: string;
  scheduledProcessingDate?: string;
}

export interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  updateAvailableStock: (productId: string, size: string, stock: number) => void;
  clearCart: () => void;
  getCartTotal: () => number; // returns total in rupees
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
                  ? { ...item, quantity: Math.min(item.quantity + quantity, item.availableStock ?? newItem.availableStock ?? 1), availableStock: newItem.availableStock ?? item.availableStock }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity: Math.min(quantity, newItem.availableStock ?? 1),
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
            items: state.items.map((item) => {
              if (item.productId === productId && item.size === size) {
                return { ...item, quantity: Math.min(quantity, item.availableStock ?? 1) };
              }
              return item;
            }),
          };
        });
      },
      updateAvailableStock: (productId, size, stock) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.productId === productId && item.size === size) {
              const newQuantity = Math.min(item.quantity, stock);
              return { ...item, availableStock: stock, quantity: newQuantity };
            }
            return item;
          }),
        }));
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
