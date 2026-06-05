// packages/types/src/shipment.ts

export type ShipmentStatus =
  | "created"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";

export interface ShipmentAddress {
  name:    string;
  line1:   string;
  line2?:  string;
  city:    string;
  state:   string;
  pincode: string;
  phone:   string;
}

export interface ShipmentWebhookEvent {
  timestamp:   number;
  status:      string;
  location?:   string;
  remarks?:    string;
  rawPayload?: string;  // JSON stringified
}

export interface Shipment {
  _id:                string;
  orderId:            string;
  provider:           string;   // "delhivery" | "shiprocket"
  awbNumber:          string;
  providerShipmentId?: string;
  status:             ShipmentStatus;
  trackingUrl?:       string;
  labelUrl?:          string;
  pickupAddress:      ShipmentAddress;
  deliveryAddress:    ShipmentAddress;
  estimatedDelivery?: number;
  deliveredAt?:       number;
  lastWebhookAt?:     number;
  rawWebhookEvents:   ShipmentWebhookEvent[];
  createdAt:          number;
  updatedAt:          number;
}

/** Tracking step for UI display */
export interface TrackingStep {
  status:    ShipmentStatus;
  timestamp: number;
  location?: string;
  remarks?:  string;
}
