// packages/types/src/claim.ts

export type ClaimType = "damage" | "wrong_item" | "missing_item";

export type ClaimStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "replacement_initiated"
  | "replacement_approved"
  | "replacement_dispatched"
  | "replacement_delivered"
  | "refund_requested"
  | "refund_approved"
  | "refunded"
  | "closed";

export type ClaimResolution = "replacement" | "refund" | "rejected";

export type ClaimEvidenceType =
  | "unboxing_video"
  | "damage_photo"
  | "wrong_item_photo"
  | "packaging_photo";

export interface Claim {
  _id:                string;
  claimNumber:        string;
  orderId:            string;
  orderItemId:        string;
  customerId:         string;
  boutiqueId:         string;
  type:               ClaimType;
  description:        string;
  status:             ClaimStatus;
  adminNotes?:        string;
  reviewedBy?:        string;
  reviewedAt?:        number;
  resolution?:        ClaimResolution;
  replacementOrderId?: string;
  refundAmount?:      number;
  submittedAt:        number;
  windowExpiresAt:    number;   // deliveredAt + 48h
  createdAt:          number;
  updatedAt:          number;
}

export interface ClaimEvidence {
  _id:                string;
  claimId:            string;
  customerId:         string;
  type:               ClaimEvidenceType;
  cloudinaryPublicId: string;
  url:                string;
  isSigned:           boolean;
  durationSeconds?:   number;
  fileSizeBytes?:     number;
  mimeType?:          string;
  isPrimary:          boolean;
  uploadedAt:         number;
  createdAt:          number;
}
