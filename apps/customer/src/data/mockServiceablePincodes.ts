// apps/customer/src/data/mockServiceablePincodes.ts
// Legacy mock serviceability logic. Fully replaced by DB-backed serviceableZones system.
export const mockServiceablePincodes: string[] = [];
export const isServiceablePincode = (pincode: string) => false;
export const isPincodeServiceable = isServiceablePincode;
