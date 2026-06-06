import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "./cart-store";

export interface CheckoutState {
  selectedDate: string | null;
  selectedSlot: string | null;
  selectedSlotWindow: string | null;
  appliedPromo: string | null;
  discountAmount: number;
  deliveryInstructions: string;
  selectedPaymentMethod: string | null;
  checkoutItems: CartItem[];
  setDeliverySelection: (date: string, slot: string, slotWindow: string) => void;
  setAppliedPromo: (promo: string | null, discount: number) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setSelectedPaymentMethod: (method: string | null) => void;
  setCheckoutItems: (items: CartItem[]) => void;
  clearCheckoutItems: () => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      selectedDate: null,
      selectedSlot: null,
      selectedSlotWindow: null,
      appliedPromo: null,
      discountAmount: 0,
      deliveryInstructions: "",
      selectedPaymentMethod: null,
      checkoutItems: [],
      setDeliverySelection: (date, slot, slotWindow) => {
        set({ selectedDate: date, selectedSlot: slot, selectedSlotWindow: slotWindow });
      },
      setAppliedPromo: (promo, discount) => {
        set({ appliedPromo: promo, discountAmount: discount });
      },
      setDeliveryInstructions: (instructions) => {
        set({ deliveryInstructions: instructions });
      },
      setSelectedPaymentMethod: (method) => {
        set({ selectedPaymentMethod: method });
      },
      setCheckoutItems: (items) => {
        set({ checkoutItems: items });
      },
      clearCheckoutItems: () => {
        set({ checkoutItems: [] });
      },
      clearCheckout: () => {
        set({
          selectedDate: null,
          selectedSlot: null,
          selectedSlotWindow: null,
          appliedPromo: null,
          discountAmount: 0,
          deliveryInstructions: "",
          selectedPaymentMethod: null,
          checkoutItems: [] as CartItem[],
        });
      },
    }),
    {
      name: "hive-checkout-storage",
    }
  )
);
