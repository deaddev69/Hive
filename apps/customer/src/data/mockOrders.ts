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
        price: 3500,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      }
    ],
    subtotal: 3500,
    discount: 0,
    deliveryFee: 99,
    codFee: 0,
    total: 3599,
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
        price: 3500,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      },
      {
        productId: "varanasi-silk-katan-saree",
        size: "One Size",
        quantity: 1,
        price: 8500,
        name: "Varanasi Silk Katan Saree",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Kashi Weaves"
      }
    ],
    subtotal: 12000,
    discount: 1200,
    deliveryFee: 0,
    codFee: 49,
    total: 10849,
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
    createdAt: "2026-06-05T15:20:00.000Z",
    items: [
      {
        productId: "crimson-rose-embroidered-lehenga",
        size: "S",
        quantity: 1,
        price: 18500,
        name: "Crimson Rose Embroidered Lehenga",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Royal Heritage"
      }
    ],
    subtotal: 18500,
    discount: 1850,
    deliveryFee: 0,
    codFee: 0,
    total: 16650,
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
        price: 8500,
        name: "Varanasi Silk Katan Saree",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Kashi Weaves"
      }
    ],
    subtotal: 8500,
    discount: 500,
    deliveryFee: 0,
    codFee: 0,
    total: 8000,
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
        price: 3500,
        name: "Emerald Hand-Painted Anarkali Kurti",
        imageUrl: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800",
        boutiqueName: "Aura By Deepa"
      }
    ],
    subtotal: 3500,
    discount: 350,
    deliveryFee: 99,
    codFee: 0,
    total: 3249,
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
