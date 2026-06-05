// packages/types/src/boutique.ts
import type { PhysicalAddress } from "./common";

export type BoutiqueStatus = "pending" | "approved" | "suspended" | "rejected";
export type BoutiqueDocumentType = "gst_certificate" | "pan" | "trade_license" | "bank_proof" | "other";
export type BoutiqueDocumentStatus = "pending" | "verified" | "rejected";

export interface Boutique {
  _id:             string;
  _creationTime:   number;
  userId:          string;
  name:            string;
  slug:            string;
  description?:    string;
  logoUrl?:        string;
  bannerUrl?:      string;
  phoneNumber:     string;
  email:           string;
  address:         PhysicalAddress;
  regionIds:       string[];
  status:          BoutiqueStatus;
  commissionRate:  number;
  gstNumber?:      string;
  hiveScore:       number;
  totalSales:      number;  // paise
  totalOrders:     number;
  approvedAt?:     number;
  approvedBy?:     string;
  rejectionReason?: string;
  createdAt:       number;
  updatedAt:       number;
}

export interface BoutiqueDocument {
  _id:         string;
  boutiqueId:  string;
  type:        BoutiqueDocumentType;
  url:         string;
  publicId:    string;
  status:      BoutiqueDocumentStatus;
  verifiedBy?: string;
  verifiedAt?: number;
  notes?:      string;
  createdAt:   number;
}

export interface Occasion {
  _id:          string;
  name:         string;
  slug:         string;
  description?: string;
  iconUrl?:     string;
  bannerUrl?:   string;
  sortOrder:    number;
  isActive:     boolean;
  createdAt:    number;
  updatedAt:    number;
}
