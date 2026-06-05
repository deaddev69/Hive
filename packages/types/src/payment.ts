// packages/types/src/payment.ts

export type PaymentStatus =
  | "created"
  | "pending"
  | "captured"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface Payment {
  _id:                string;
  orderId:            string;
  customerId:         string;
  razorpayOrderId:    string;
  razorpayPaymentId?: string;
  amount:             number;   // paise
  currency:           string;   // "INR"
  status:             PaymentStatus;
  method?:            string;   // "upi" | "card" | "netbanking" | "wallet"
  refundId?:          string;
  refundAmount?:      number;
  refundedAt?:        number;
  webhookEvents:      PaymentWebhookEvent[];
  createdAt:          number;
  updatedAt:          number;
}

export interface PaymentWebhookEvent {
  event:     string;
  timestamp: number;
  payload?:  string;  // JSON stringified
}

/** Client-side Razorpay checkout options */
export interface RazorpayCheckoutOptions {
  key:          string;
  amount:       number;   // paise
  currency:     string;
  name:         string;
  description?: string;
  order_id:     string;
  prefill?: {
    name?:    string;
    email?:   string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}
