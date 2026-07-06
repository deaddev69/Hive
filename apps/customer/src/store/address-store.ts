import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Address {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  receiverName?: string;
  deliveryInstructions?: string;
  entryPhotoId?: string;
  entryPhotoUrl?: string;
  isDefault: boolean;
}

export interface AddressState {
  addresses: Address[];
  selectedAddressId: string | null;
  addAddress: (address: Omit<Address, "id">) => void;
  updateAddress: (id: string, updated: Partial<Address>) => void;
  deleteAddress: (id: string) => void;
  selectAddress: (id: string) => void;
}

const mockAddresses: Address[] = [
  {
    id: "addr_1",
    name: "Aditi Rao",
    phone: "9876543210",
    addressLine1: "Plot 42, Road Number 12, Banjara Hills",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500034",
    isDefault: true,
  },
  {
    id: "addr_2",
    name: "Rohit Kumar",
    phone: "8765432109",
    addressLine1: "Apt 4B, Hilltop Apartments, Hitech City",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500081",
    isDefault: false,
  },
  {
    id: "addr_3",
    name: "Meera Nair",
    phone: "7654321098",
    addressLine1: "24/850 Heritage Villa, MG Road",
    city: "Kochi",
    state: "Kerala",
    pincode: "682030",
    isDefault: false,
  },
];

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      addresses: mockAddresses,
      selectedAddressId: "addr_1",
      addAddress: (newAddr) => {
        const id = `addr_${Math.random().toString(36).substring(2, 9)}`;
        set((state) => {
          let updatedAddresses = [...state.addresses];
          if (newAddr.isDefault) {
            // Set all other defaults to false
            updatedAddresses = updatedAddresses.map((addr) => ({
              ...addr,
              isDefault: false,
            }));
          }
          const finalAddr = { ...newAddr, id };
          return {
            addresses: [...updatedAddresses, finalAddr],
            selectedAddressId: newAddr.isDefault ? id : state.selectedAddressId || id,
          };
        });
      },
      updateAddress: (id, updated) => {
        set((state) => {
          let updatedAddresses = state.addresses.map((addr) =>
            addr.id === id ? { ...addr, ...updated } : addr
          );
          if (updated.isDefault) {
            updatedAddresses = updatedAddresses.map((addr) =>
              addr.id !== id ? { ...addr, isDefault: false } : addr
            );
          }
          return { addresses: updatedAddresses };
        });
      },
      deleteAddress: (id) => {
        set((state) => {
          const filtered = state.addresses.filter((addr) => addr.id !== id);
          let nextSelected = state.selectedAddressId;
          if (state.selectedAddressId === id) {
            nextSelected = filtered.length > 0 ? (filtered[0]?.id ?? null) : null;
          }
          return {
            addresses: filtered,
            selectedAddressId: nextSelected,
          };
        });
      },
      selectAddress: (id) => {
        set({ selectedAddressId: id });
      },
    }),
    {
      name: "hive-address-storage",
    }
  )
);
