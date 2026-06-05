// packages/types/src/common.ts
// Shared primitive types and utilities

/** Convex-generated document ID type placeholder (replaced by generated types at runtime) */
export type DocId<T extends string = string> = string & { __tableName: T };

/** Monetary amount in Indian Paise (1 INR = 100 paise) */
export type Paise = number;

/** ISO 8601 date string YYYY-MM-DD */
export type ISODate = string;

/** Time string HH:MM */
export type TimeString = string;

/** E.164 phone number format e.g. +919876543210 */
export type E164Phone = string;

/** Pincode — 6-digit Indian postal code */
export type Pincode = string;

/** GeoJSON polygon string */
export type GeoJsonString = string;

/** Cloudinary public ID */
export type CloudinaryPublicId = string;

/** Cloudinary CDN URL */
export type CloudinaryUrl = string;

/** Epoch milliseconds timestamp */
export type EpochMs = number;

// ─── ADDRESS ──────────────────────────────────────────────────────────────────
export interface AddressSnapshot {
  label:   string;
  line1:   string;
  line2?:  string;
  city:    string;
  state:   string;
  pincode: Pincode;
  lat:     number;
  lng:     number;
}

export interface PhysicalAddress {
  line1:   string;
  line2?:  string;
  city:    string;
  state:   string;
  pincode: Pincode;
  lat:     number;
  lng:     number;
}

// ─── MEASUREMENT MATRIX ───────────────────────────────────────────────────────
export type ProductSize = "XS" | "S" | "M" | "L" | "XL" | "XXL" | "Free";

export interface SizeMeasurement {
  bust?:   string;  // in cm
  waist?:  string;
  hip?:    string;
  length?: string;
}

export type MeasurementMatrix = Partial<Record<ProductSize, SizeMeasurement>>;

// ─── PAGINATION ───────────────────────────────────────────────────────────────
export interface PaginationResult<T> {
  items: T[];
  isDone: boolean;
  continueCursor: string | null;
}

export interface PaginationArgs {
  cursor?: string | null;
  limit?: number;
}
