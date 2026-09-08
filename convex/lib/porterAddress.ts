// convex/lib/porterAddress.ts
// Builds the `address` object Porter expects on /v1/orders/create.
//
// Porter's contract has five distinct address slots, and each one means
// something specific to the rider on the ground:
//
//   apartment_address  flat / door / house number
//   street_address1    the main line (building, street)
//   street_address2    the supporting line (area, locality)
//   landmark           what to look for when the street is ambiguous
//   lat / lng          where the app actually drops the pin
//
// Hive stores customer addresses from a map picker, so in practice `line1` and
// `line2` are empty and the real content lives in `formattedAddress`,
// `houseNumber` and `landmark`. Every call site used to inline its own mapping,
// and the weaker ones read `line1` alone — which is empty for every order in
// production, so Porter received a blank street address and only a pin.
//
// These builders are pure so the mapping can be tested without touching Porter.

export type PorterAddress = {
  apartment_address?: string;
  street_address1: string;
  street_address2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  lat: number;
  lng: number;
  contact_details: {
    name: string;
    phone_number: string;
  };
};

/** Snapshot of where the customer wants the parcel, as stored on the order. */
export type CustomerAddressSnapshot = {
  line1?: string | null;
  line2?: string | null;
  formattedAddress?: string | null;
  houseNumber?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  receiverName?: string | null;
  deliveryInstructions?: string | null;
};

/** Boutique end of the trip — either the live record or the order's snapshot. */
export type BoutiqueAddressSource = {
  boutiqueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  addressDetails?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    lat?: number | null;
    lng?: number | null;
  } | null;
};

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Porter wants a dialable Indian number. We keep the last ten digits so that
 * stored values like "919747657294", "+91 8075769986" and "8075769986" all
 * normalise to the same thing.
 */
export function toPorterPhone(raw: unknown): string {
  const digits = clean(raw)?.replace(/\D/g, "") ?? "";
  const last10 = digits.slice(-10);
  if (last10.length !== 10) return "";
  return `+91${last10}`;
}

/** Drop the keys Porter treats as absent rather than sending empty strings. */
function compact(address: PorterAddress): PorterAddress {
  const out: any = { ...address };
  for (const key of [
    "apartment_address",
    "street_address2",
    "landmark",
    "city",
    "state",
    "pincode",
  ]) {
    if (!out[key]) delete out[key];
  }
  return out as PorterAddress;
}

/**
 * The customer's end of the trip.
 *
 * `houseNumber` goes to `apartment_address` — its own field in Porter's schema —
 * rather than being folded into a street line, so the rider sees the door number
 * separately from the street.
 */
export function buildCustomerPorterAddress(
  address: CustomerAddressSnapshot,
  contactName: string,
  phone?: string | null
): PorterAddress {
  const line1 = clean(address.line1);
  const formatted = clean(address.formattedAddress);
  const line2 = clean(address.line2);
  const locality = clean(address.locality);

  // When line1 carries the street, formattedAddress is still useful as the
  // supporting line; when it does not, formattedAddress *is* the street line.
  const street1 = line1 ?? formatted ?? "Delivery address";
  const street2 = line2 ?? (line1 ? formatted : locality);

  return compact({
    apartment_address: clean(address.houseNumber),
    street_address1: street1,
    street_address2: street2 === street1 ? undefined : street2,
    landmark: clean(address.landmark),
    city: clean(address.city),
    state: clean(address.state),
    pincode: clean(address.pincode),
    country: "India",
    lat: typeof address.lat === "number" ? address.lat : 0,
    lng: typeof address.lng === "number" ? address.lng : 0,
    contact_details: {
      // The receiver name is what the customer typed for this address, so it
      // beats any name derived from the account — most Hive accounts are
      // phone-only and carry no name at all.
      name: clean(address.receiverName) ?? clean(contactName) ?? "Customer",
      phone_number: toPorterPhone(phone ?? address.phone),
    },
  });
}

/**
 * The boutique's end of the trip.
 *
 * `addressDetails` is the structured record filled in at onboarding; the flat
 * `address` string is the legacy field. We prefer the structured line and fall
 * back, and take coordinates from whichever source actually has them.
 */
export function buildBoutiquePorterAddress(
  boutique: BoutiqueAddressSource | null | undefined,
  contactName?: string | null,
  phone?: string | null
): PorterAddress {
  const details = boutique?.addressDetails ?? null;
  const structured = clean(details?.line1);
  const flat = clean(boutique?.address);

  const street1 = structured ?? flat ?? "Store";
  const street2 = clean(details?.line2) ?? (structured && flat !== structured ? flat : undefined);

  const lat = boutique?.latitude || details?.lat || 0;
  const lng = boutique?.longitude || details?.lng || 0;

  return compact({
    street_address1: street1,
    street_address2: street2 === street1 ? undefined : street2,
    city: clean(boutique?.city) ?? clean(details?.city),
    state: clean(boutique?.state) ?? clean(details?.state),
    pincode: clean(boutique?.pincode) ?? clean(details?.pincode),
    country: "India",
    lat,
    lng,
    contact_details: {
      name: clean(contactName) ?? clean(boutique?.boutiqueName) ?? "Boutique",
      phone_number: toPorterPhone(phone ?? boutique?.phone),
    },
  });
}

/**
 * Refuse to book a trip Porter cannot actually complete.
 *
 * A missing pin sends the rider to (0, 0) and a missing phone number leaves them
 * with no way to reach the door, so both are worth failing loudly on before the
 * booking rather than after.
 */
export function assertPorterAddressUsable(address: PorterAddress, role: string): void {
  const problems: string[] = [];
  if (!address.lat || !address.lng) problems.push("missing coordinates");
  if (!address.contact_details.phone_number) problems.push("missing contact phone");
  if (!address.street_address1.trim()) problems.push("missing street address");
  if (problems.length > 0) {
    throw new Error(`Porter ${role} address unusable: ${problems.join(", ")}.`);
  }
}
