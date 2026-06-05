// packages/types/src/order.ts
import type { AddressSnapshot } from "./common";

export type OrderStatus =
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "claim_submitted"
  | "replacement_requested"
  | "replacement_approved"
  | "replacement_dispatched"
  | "replacement_delivered"
  | "refund_requested"
  | "refunded";

export type OrderPaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface Order {
  _id:                  string;
  _creationTime:        number;
  orderNumber:          string;
  customerId:           string;
  boutiqueId:           string;
  status:               OrderStatus;
  deliveryAddress:      AddressSnapshot;
  addressId:            string;
  deliverySlotId?:      string;
  subtotal:             number;   // paise
  deliveryFee:          number;   // paise
  discount:             number;   // paise
  total:                number;   // paise
  commissionAmount:     number;   // paise
  paymentId?:           string;
  paymentStatus:        OrderPaymentStatus;
  shipmentId?:          string;
  notes?:               string;
  cancelledAt?:         number;
  cancelReason?:        string;
  cancelledBy?:         string;
  confirmedAt?:         number;
  deliveredAt?:         number;
  claimWindowExpiresAt?: number;  // deliveredAt + 48h
  createdAt:            number;
  updatedAt:            number;
}

export interface OrderItem {
  _id:             string;
  orderId:         string;
  productId:       string;
  variantId:       string;
  boutiqueId:      string;
  productName:     string;    // snapshot
  variantSize:     string;    // snapshot
  variantColor?:   string;    // snapshot
  imageUrl:        string;    // snapshot
  sku:             string;    // snapshot
  priceAtPurchase: number;    // paise — locked forever
  quantity:        number;
  subtotal:        number;    // paise
}

export interface DeliverySlot {
  _id:         string;
  regionId:    string;
  date:        string;    // YYYY-MM-DD
  startTime:   string;   // HH:MM
  endTime:     string;   // HH:MM
  capacity:    number;
  bookedCount: number;
  isActive:    boolean;
  createdAt:   number;
  updatedAt:   number;
}

/** Cart item before order creation */
export interface CartItem {
  variantId: string;
  quantity:  number;
  // Resolved at display time:
  productId?:   string;
  productName?: string;
  variantSize?: string;
  price?:       number;
  imageUrl?:    string;
}
