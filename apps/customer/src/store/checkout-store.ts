import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CheckoutState {
  selectedDate: string | null;
  selectedSlot: string | null;
  appliedPromo: string | null;
  discountAmount: number;
  deliveryInstructions: string;
  selectedPaymentMethod: string | null;
  setDeliverySelection: (date: string, slot: string) => void;
  setAppliedPromo: (promo: string | null, discount: number) => void;
  setDeliveryInstructions: (instructions: string) => void;
  setSelectedPaymentMethod: (method: string | null) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      selectedDate: null,
      selectedSlot: null,
      appliedPromo: null,
      discountAmount: 0,
      deliveryInstructions: "",
      selectedPaymentMethod: null,
      setDeliverySelection: (date, slot) => {
        set({ selectedDate: date, selectedSlot: slot });
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
      clearCheckout: () => {
        set({
          selectedDate: null,
          selectedSlot: null,
          appliedPromo: null,
          discountAmount: 0,
          deliveryInstructions: "",
          selectedPaymentMethod: null,
        });
      },
    }),
    {
      name: "hive-checkout-storage",
    }
  )
);
