// convex/addresses.ts
// Address CRUD for the HIVE customer app.
// All operations are scoped to the authenticated user — no cross-user access possible.

import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, getCurrentUserOrNull } from "./lib/auth";
import { checkRateLimit } from "./lib/rateLimit";
import { api as rawApi, internal as rawInternal } from "./_generated/api";
import { haversineKm } from "./lib/serviceability";
const api = rawApi as any;
const internal = rawInternal as any;

const LOCALITY_DICTIONARY: Record<string, string> = {
  "682020": "Vyttila",
  "682011": "Ernakulam",
  "682030": "Kakkanad",
  "682025": "Kadavanthra",
  "682024": "Kalamassery",
  "682019": "Palarivattom",
};

interface GoogleGeocodeData {
  formattedAddress: string;
  locality: string;
  pincode: string;
  placeId: string;
}

async function fetchGoogleMapsReverseGeocode(lat: number, lng: number): Promise<GoogleGeocodeData> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_SERVER_KEY not configured in Convex environment variables.");
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Maps Reverse Geocode Failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    throw new Error(`Google Maps Reverse Geocode Error: ${data.status}`);
  }

  const result = data.results[0];
  
  let locality = "";
  let pincode = "";

  for (const component of result.address_components) {
    if (component.types.includes("locality") || component.types.includes("sublocality")) {
      locality = locality || component.long_name;
    }
    if (component.types.includes("postal_code")) {
      pincode = component.long_name;
    }
  }

  return {
    formattedAddress: result.formatted_address || "",
    locality,
    pincode,
    placeId: result.place_id || "",
  };
}



function validateCoordinates(lat?: number, lng?: number) {
  if (
    lat === undefined ||
    lat === null ||
    Number.isNaN(lat) ||
    !Number.isFinite(lat) ||
    lat === 0 ||
    lng === undefined ||
    lng === null ||
    Number.isNaN(lng) ||
    !Number.isFinite(lng) ||
    lng === 0
  ) {
    throw new Error(
      "Invalid geolocation coordinates. Coordinates cannot be empty, NaN, or at Null Island (0, 0)."
    );
  }
}

/**
 * List all non-deleted addresses for the current user.
 * Returns [] for unauthenticated users — the frontend handles the redirect.
 */
export const list = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return [];

    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
      
    const validAddresses = addresses.filter((a) => !a.isDeleted);
    
    return await Promise.all(
      validAddresses.map(async (addr) => {
        let entryPhotoUrl = undefined;
        if (addr.entryPhotoId) {
          entryPhotoUrl = await ctx.storage.getUrl(addr.entryPhotoId);
        }
        return {
          ...addr,
          entryPhotoUrl,
        };
      })
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Checks address coordinates against active reference serviceable pincodes.
 * Primary check is geographical (distance < 15km).
 */
export const checkAddressVerification = query({
  args: {
    lat: v.number(),
    lng: v.number(),
    pincode: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Fetch all active serviceable pincodes
    const activePincodes = await ctx.db
      .query("serviceablePincodes")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    if (activePincodes.length === 0) {
      return { serviceable: false, reason: "No active serviceable pincodes seeded.", resolvedPincode: args.pincode };
    }

    // 2. Find closest serviceable pincode and calculate Haversine distance
    let closestDist = Infinity;
    let closestPincodeRecord = null;

    for (const p of activePincodes) {
      const dist = haversineKm(args.lat, args.lng, p.lat, p.lng);
      if (dist < closestDist) {
        closestDist = dist;
        closestPincodeRecord = p;
      }
    }

    const isGeographicallyServiceable = closestDist <= 15; // Within 15km limit

    if (!isGeographicallyServiceable) {
      return {
        serviceable: false,
        reason: `Address is ${closestDist.toFixed(2)}km away from the nearest serviceable center, which exceeds the 15km limit.`,
        resolvedPincode: args.pincode,
      };
    }

    // 3. Resolve regionId. Let's find an active region that has this pincode, or the closest pincode
    const regions = await ctx.db
      .query("regions")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Try finding by geocoded/input pincode first
    let region = regions.find((r) => r.pincodes.includes(args.pincode));
    if (!region && closestPincodeRecord) {
      region = regions.find((r) => r.pincodes.includes(closestPincodeRecord.pincode));
    }

    return {
      serviceable: true,
      regionId: region ? region._id : null,
      resolvedPincode: closestPincodeRecord?.pincode ?? args.pincode,
    };
  },
});

/**
 * Mutation to enforce rate limits on third-party geocoding API calls.
 */
export const verifyAndIncrementGeocodeRateLimit = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    await checkRateLimit(ctx, `address_geocode:${user._id}`, 10, 15 * 60 * 1000);
  },
});

/**
 * Add a new address for the current user (via Action + Nominatim geocoding).
 */
export const add = action({
  args: {
    label: v.string(),
    line1: v.optional(v.string()),
    line2: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    pincode: v.string(),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    formattedAddress: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    landmark: v.optional(v.string()),
    phone: v.optional(v.string()),
    receiverName: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
    entryPhotoId: v.optional(v.id("_storage")),
    isDefault: v.boolean(),
    token: v.optional(v.string()),
    placeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Enforce rate limiting before making third-party REST API calls
    await ctx.runMutation(api.addresses.verifyAndIncrementGeocodeRateLimit, { token: args.token });

    const user = await ctx.runQuery(api.users.getAuthenticatedUserQuery, { token: args.token });
    if (!user) throw new Error("Unauthenticated");

    const lat = args.lat!;
    const lng = args.lng!;
    validateCoordinates(lat, lng);

    let locality: string | undefined = undefined;
    let resolvedPincode = args.pincode;
    let formattedAddress = args.formattedAddress || "";
    let placeId = args.placeId || "";

    // Call Google Maps API for reverse geocoding
    try {
      const googleData = await fetchGoogleMapsReverseGeocode(lat, lng);
      locality = googleData.locality;
      if (googleData.pincode) {
        resolvedPincode = googleData.pincode;
      }
      if (googleData.formattedAddress) {
        formattedAddress = googleData.formattedAddress;
      }
      if (googleData.placeId) {
        placeId = googleData.placeId;
      }
    } catch (err) {
      console.error("[Google Maps API Error]:", err);
    }

    // Verify serviceability
    const verification = await ctx.runQuery(api.addresses.checkAddressVerification, {
      lat,
      lng,
      pincode: resolvedPincode,
    });

    let finalLocality = locality;
    if (!finalLocality) {
      const p = verification.resolvedPincode || args.pincode;
      finalLocality = LOCALITY_DICTIONARY[p] || "Kochi";
    }

    const addressStatus = verification.serviceable ? "verified" : "rejected";

    return await ctx.runMutation(internal.addresses.addInternal, {
      userId: user._id,
      label: args.label,
      line1: args.line1,
      line2: args.line2,
      city: args.city,
      state: args.state,
      pincode: resolvedPincode || args.pincode,
      lat,
      lng,
      formattedAddress,
      houseNumber: args.houseNumber,
      landmark: args.landmark,
      phone: args.phone,
      receiverName: args.receiverName,
      deliveryInstructions: args.deliveryInstructions,
      entryPhotoId: args.entryPhotoId,
      isDefault: args.isDefault,
      addressStatus,
      locality: finalLocality,
      verifiedAt: Date.now(),
      verificationSource: "google",
      regionId: verification.regionId ?? undefined,
      placeId,
    });
  },
});

export const addInternal = internalMutation({
  args: {
    userId: v.id("users"),
    label: v.string(),
    line1: v.optional(v.string()),
    line2: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    pincode: v.string(),
    lat: v.number(),
    lng: v.number(),
    formattedAddress: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    landmark: v.optional(v.string()),
    phone: v.optional(v.string()),
    receiverName: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
    entryPhotoId: v.optional(v.id("_storage")),
    isDefault: v.boolean(),
    addressStatus: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    locality: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    verificationSource: v.optional(v.union(v.literal("nominatim"), v.literal("google"))),
    regionId: v.optional(v.id("regions")),
    placeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit address creation: max 10 per user per 15 minutes
    await checkRateLimit(ctx, `address_add:${args.userId}`, 10, 15 * 60 * 1000);

    const now = Date.now();

    if (args.isDefault) {
      // Unset all other defaults
      const existing = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .take(50);
      for (const addr of existing) {
        if (addr.isDefault && !addr.isDeleted) {
          await ctx.db.patch(addr._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("addresses", {
      userId: args.userId,
      label: args.label,
      line1: args.line1,
      line2: args.line2,
      city: args.city,
      state: args.state,
      pincode: args.pincode,
      lat: args.lat,
      lng: args.lng,
      formattedAddress: args.formattedAddress,
      houseNumber: args.houseNumber,
      landmark: args.landmark,
      phone: args.phone,
      receiverName: args.receiverName,
      deliveryInstructions: args.deliveryInstructions,
      entryPhotoId: args.entryPhotoId,
      isDefault: args.isDefault,
      isDeleted: false,
      addressStatus: args.addressStatus,
      locality: args.locality,
      verifiedAt: args.verifiedAt,
      verificationSource: args.verificationSource,
      regionId: args.regionId,
      placeId: args.placeId,
      createdAt: now,
    });
  },
});

export const getInternal = internalQuery({
  args: {
    addressId: v.id("addresses"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== args.userId) return null;
    return addr;
  },
});

/**
 * Update an address (via Action + Google geocoding).
 */
export const update = action({
  args: {
    addressId: v.id("addresses"),
    label: v.optional(v.string()),
    line1: v.optional(v.string()),
    line2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    pincode: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    formattedAddress: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    landmark: v.optional(v.string()),
    phone: v.optional(v.string()),
    receiverName: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
    entryPhotoId: v.optional(v.id("_storage")),
    clearEntryPhoto: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    token: v.optional(v.string()),
    placeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Enforce rate limiting before making third-party REST API calls
    await ctx.runMutation(api.addresses.verifyAndIncrementGeocodeRateLimit, { token: args.token });

    const user = await ctx.runQuery(api.users.getAuthenticatedUserQuery, { token: args.token });
    if (!user) throw new Error("Unauthenticated");

    const existingAddress = await ctx.runQuery(internal.addresses.getInternal, {
      addressId: args.addressId,
      userId: user._id,
    });
    if (!existingAddress) throw new Error("Address not found");

    const newLat = args.lat !== undefined ? args.lat : existingAddress.lat;
    const newLng = args.lng !== undefined ? args.lng : existingAddress.lng;
    validateCoordinates(newLat, newLng);

    const latChanged = args.lat !== undefined || args.lng !== undefined;
    let locality = existingAddress.locality;
    let resolvedPincode = args.pincode || existingAddress.pincode;
    let formattedAddress = args.formattedAddress || existingAddress.formattedAddress;
    let addressStatus = existingAddress.addressStatus;
    let regionId = existingAddress.regionId;
    let placeId = args.placeId || existingAddress.placeId;

    if (latChanged || args.pincode !== undefined) {
      if (latChanged) {
        try {
          const googleData = await fetchGoogleMapsReverseGeocode(newLat, newLng);
          locality = googleData.locality;
          if (googleData.pincode) {
            resolvedPincode = googleData.pincode;
          }
          if (googleData.formattedAddress) {
            formattedAddress = googleData.formattedAddress;
          }
          if (googleData.placeId) {
            placeId = googleData.placeId;
          }
        } catch (err) {
          console.error("[Google Maps API Error during update]:", err);
        }
      }

      // Verify serviceability
      const verification = await ctx.runQuery(api.addresses.checkAddressVerification, {
        lat: newLat,
        lng: newLng,
        pincode: resolvedPincode,
      });

      if (!locality) {
        locality = LOCALITY_DICTIONARY[resolvedPincode] || "Kochi";
      }

      addressStatus = verification.serviceable ? "verified" : "rejected";
      regionId = verification.regionId;
    }

    return await ctx.runMutation(internal.addresses.updateInternal, {
      userId: user._id,
      addressId: args.addressId,
      label: args.label,
      line1: args.line1,
      line2: args.line2,
      city: args.city,
      state: args.state,
      pincode: resolvedPincode,
      lat: args.lat,
      lng: args.lng,
      formattedAddress,
      houseNumber: args.houseNumber,
      landmark: args.landmark,
      phone: args.phone,
      receiverName: args.receiverName,
      deliveryInstructions: args.deliveryInstructions,
      entryPhotoId: args.entryPhotoId,
      clearEntryPhoto: args.clearEntryPhoto,
      isDefault: args.isDefault,
      addressStatus: addressStatus ?? undefined,
      locality,
      verifiedAt: latChanged ? Date.now() : existingAddress.verifiedAt,
      verificationSource: latChanged ? "google" : existingAddress.verificationSource,
      regionId: regionId ?? undefined,
      placeId,
    });
  },
});

export const updateInternal = internalMutation({
  args: {
    userId: v.id("users"),
    addressId: v.id("addresses"),
    label: v.optional(v.string()),
    line1: v.optional(v.string()),
    line2: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    pincode: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    formattedAddress: v.optional(v.string()),
    houseNumber: v.optional(v.string()),
    landmark: v.optional(v.string()),
    phone: v.optional(v.string()),
    receiverName: v.optional(v.string()),
    deliveryInstructions: v.optional(v.string()),
    entryPhotoId: v.optional(v.id("_storage")),
    clearEntryPhoto: v.optional(v.boolean()),
    isDefault: v.optional(v.boolean()),
    addressStatus: v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected"))),
    locality: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    verificationSource: v.optional(v.union(v.literal("nominatim"), v.literal("google"))),
    regionId: v.optional(v.id("regions")),
    placeId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== args.userId) throw new Error("Address not found");

    if (args.isDefault) {
      const all = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .take(50);
      for (const a of all) {
        if (a._id !== args.addressId && a.isDefault && !a.isDeleted) {
          await ctx.db.patch(a._id, { isDefault: false });
        }
      }
    }
    
    // Check for orphaned photo
    const oldEntryPhotoId = addr.entryPhotoId;
    let shouldDeleteOld = false;

    if (args.clearEntryPhoto && oldEntryPhotoId) {
      shouldDeleteOld = true;
    } else if (args.entryPhotoId && oldEntryPhotoId && args.entryPhotoId !== oldEntryPhotoId) {
      shouldDeleteOld = true;
    }

    const { addressId, userId, clearEntryPhoto, ...fields } = args;
    const patchData: any = { ...fields };
    if (clearEntryPhoto) {
      patchData.entryPhotoId = undefined; // convex patch ignores undefined, but we can set it to undefined? Wait.
      // In Convex, to clear an optional field, you set it to undefined.
      // But passing undefined in `patchData` removes the key from the patch object entirely in some setups.
      // Actually, passing `entryPhotoId: undefined` to patch() in Convex WILL remove the field from the document.
      patchData.entryPhotoId = undefined;
    }
    
    await ctx.db.patch(addressId, patchData);
    
    if (shouldDeleteOld && oldEntryPhotoId) {
      try {
        await ctx.storage.delete(oldEntryPhotoId);
      } catch (err) {
        console.error("Failed to delete orphaned entry photo:", err);
      }
    }
  },
});

/**
 * Soft-delete an address. Only the owner can delete their address.
 */
export const remove = mutation({
  args: { addressId: v.id("addresses"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) throw new Error("Address not found");
    await ctx.db.patch(args.addressId, { isDeleted: true, isDefault: false });
  },
});

/**
 * Set an address as the default, clearing all others.
 */
export const setDefault = mutation({
  args: { addressId: v.id("addresses"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) throw new Error("Address not found");

    const all = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(50);

    for (const a of all) {
      if (!a.isDeleted) {
        await ctx.db.patch(a._id, { isDefault: a._id === args.addressId });
      }
    }
  },
});

