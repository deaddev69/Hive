// packages/types/src/notification.ts

export type NotificationType =
  | "order_confirmed"
  | "order_rejected"
  | "order_picked_up"
  | "order_in_transit"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "claim_received"
  | "claim_approved"
  | "claim_rejected"
  | "replacement_dispatched"
  | "replacement_delivered"
  | "refund_initiated"
  | "refund_processed"
  | "boutique_approved"
  | "boutique_rejected"
  | "boutique_suspended"
  | "product_approved"
  | "product_rejected"
  | "low_stock_alert"
  | "order_sla_breach";

export type NotificationChannel = "whatsapp" | "email" | "in_app";
export type NotificationStatus = "pending" | "sent" | "failed";

export interface NotificationData {
  orderId?:   string;
  claimId?:   string;
  productId?: string;
  url?:       string;
}

export interface Notification {
  _id:       string;
  userId:    string;
  type:      NotificationType;
  channel:   NotificationChannel;
  title:     string;
  body:      string;
  data?:     NotificationData;
  status:    NotificationStatus;
  isRead:    boolean;
  sentAt?:   number;
  error?:    string;
  createdAt: number;
}
