import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "./cart-store";
import { Address } from "./address-store";
import { mockOrders } from "../data/mockOrders";

export interface Order {
  id: string;
  convexId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  codFee: number;
  total: number;
  paymentMethod: string;
  address: Address;
  deliveryDate: string;
  deliverySlot: string;
  deliverySlotWindow?: string;
  createdAt: string;
  status: "placed" | "confirmed" | "picked_up" | "out_for_delivery" | "delivered" | "cancelled";
  cancellationReason?: string;
}

export interface OrderState {
  orders: Order[];
  latestOrder: Order | null;
  placeOrder: (orderDetails: Omit<Order, "createdAt" | "status" | "cancellationReason">) => string;
  clearLatestOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: mockOrders,
      latestOrder: null,
      placeOrder: (orderDetails) => {
        const createdAt = new Date().toISOString();
        
        const newOrder: Order = {
          ...orderDetails,
          createdAt,
          status: "placed",
        };

        set((state) => ({
          orders: [newOrder, ...state.orders],
          latestOrder: newOrder,
        }));

        return newOrder.id;
      },
      clearLatestOrder: () => {
        set({ latestOrder: null });
      },
    }),
    {
      name: "hive-orders-storage",
    }
  )
);
