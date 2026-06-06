import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CheckoutState {
  selectedDate: string | null;
  selectedSlot: string | null;
  setDeliverySelection: (date: string, slot: string) => void;
  clearCheckout: () => void;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      selectedDate: null,
      selectedSlot: null,
      setDeliverySelection: (date, slot) => {
        set({ selectedDate: date, selectedSlot: slot });
      },
      clearCheckout: () => {
        set({ selectedDate: null, selectedSlot: null });
      },
    }),
    {
      name: "hive-checkout-storage",
    }
  )
);
