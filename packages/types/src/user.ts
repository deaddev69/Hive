// packages/types/src/user.ts

export type UserRole = "customer" | "boutique_owner" | "admin";

export interface HiveUser {
  _id:             string;
  _creationTime:   number;
  clerkId:         string;
  email?:          string;
  phone?:          string;
  role:            UserRole;
  isActive:        boolean;
  isPhoneVerified: boolean;
  createdAt:       number;
  updatedAt:       number;
}

export interface CustomerProfile {
  _id:                  string;
  _creationTime:        number;
  userId:               string;
  displayName:          string;
  avatarUrl?:           string;
  defaultAddressId?:    string;
  regionId?:            string;
  hiveScore:            number;
  totalOrders:          number;
  totalClaimsSubmitted: number;
  updatedAt:            number;
}

export interface HiveAddress {
  _id:       string;
  userId:    string;
  label:     string;
  line1:     string;
  line2?:    string;
  city:      string;
  state:     string;
  pincode:   string;
  lat:       number;
  lng:       number;
  regionId?: string;
  isDefault: boolean;
  isDeleted: boolean;
  createdAt: number;
}
