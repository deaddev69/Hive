import { Order } from "../store/order-store";

export const mockOrders: Order[] = [
  {
    id: "HIVE-829471",
    status: "placed",
    createdAt: "2026-06-06T11:00:00.000Z",
    items: [
      {
        productId: "emerald-hand-painted-anarkali-kurti",
        size: "M",
        quantity: 1,
        price: 350000,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      }
    ],
    subtotal: 350000,
    discount: 0,
    deliveryFee: 9900,
    codFee: 0,
    total: 359900,
    paymentMethod: "upi",
    address: {
      id: "addr_1",
      name: "Aditi Rao",
      phone: "9876543210",
      addressLine1: "Plot 42, Road Number 12, Banjara Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      isDefault: true
    },
    deliveryDate: "Tomorrow",
    deliverySlot: "Morning Slot (10 AM - 1 PM)"
  },
  {
    id: "HIVE-639104",
    status: "out_for_delivery",
    createdAt: "2026-06-06T08:30:00.000Z",
    items: [
      {
        productId: "emerald-hand-painted-anarkali-kurti",
        size: "L",
        quantity: 1,
        price: 350000,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      },
      {
        productId: "varanasi-silk-katan-saree",
        size: "One Size",
        quantity: 1,
        price: 850000,
        name: "Varanasi Silk Katan Saree",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Kashi Weaves"
      }
    ],
    subtotal: 1200000,
    discount: 120000,
    deliveryFee: 0,
    codFee: 4900,
    total: 1084900,
    paymentMethod: "cod",
    address: {
      id: "addr_2",
      name: "Rohit Kumar",
      phone: "8765432109",
      addressLine1: "Apt 4B, Hilltop Apartments, Hitech City",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      isDefault: false
    },
    deliveryDate: "Today",
    deliverySlot: "Evening Slot (4 PM - 7 PM)"
  },
  {
    id: "HIVE-304918",
    status: "picked_up",
    createdAt: "2026-05-28T14:00:00.000Z", // aligned with others
    items: [
      {
        productId: "crimson-rose-embroidered-lehenga",
        size: "S",
        quantity: 1,
        price: 1850000,
        name: "Crimson Rose Embroidered Lehenga",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Royal Heritage"
      }
    ],
    subtotal: 1850000,
    discount: 185000,
    deliveryFee: 0,
    codFee: 0,
    total: 1665000,
    paymentMethod: "card",
    address: {
      id: "addr_1",
      name: "Aditi Rao",
      phone: "9876543210",
      addressLine1: "Plot 42, Road Number 12, Banjara Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      isDefault: true
    },
    deliveryDate: "Tomorrow",
    deliverySlot: "Afternoon Slot (1 PM - 4 PM)"
  },
  {
    id: "HIVE-194830",
    status: "delivered",
    createdAt: "2026-06-03T10:00:00.000Z",
    items: [
      {
        productId: "varanasi-silk-katan-saree",
        size: "One Size",
        quantity: 1,
        price: 850000,
        name: "Varanasi Silk Katan Saree",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Kashi Weaves"
      }
    ],
    subtotal: 850000,
    discount: 50000,
    deliveryFee: 0,
    codFee: 0,
    total: 800000,
    paymentMethod: "netbanking",
    address: {
      id: "addr_3",
      name: "Meera Nair",
      phone: "7654321098",
      addressLine1: "24/850 Heritage Villa, MG Road",
      city: "Kochi",
      state: "Kerala",
      pincode: "682030",
      isDefault: false
    },
    deliveryDate: "03 Jun 2026",
    deliverySlot: "Morning Slot (10 AM - 1 PM)"
  },
  {
    id: "HIVE-482017",
    status: "cancelled",
    createdAt: "2026-05-28T14:00:00.000Z",
    items: [
      {
        productId: "emerald-hand-painted-anarkali-kurti",
        size: "XL",
        quantity: 1,
        price: 350000,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      }
    ],
    subtotal: 350000,
    discount: 35000,
    deliveryFee: 9900,
    codFee: 0,
    total: 324900,
    paymentMethod: "upi",
    address: {
      id: "addr_2",
      name: "Rohit Kumar",
      phone: "8765432109",
      addressLine1: "Apt 4B, Hilltop Apartments, Hitech City",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      isDefault: false
    },
    deliveryDate: "30 May 2026",
    deliverySlot: "Morning Slot (10 AM - 1 PM)",
    cancellationReason: "Buyer requested cancellation due to travel schedule conflicts."
  }
];
