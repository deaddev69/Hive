import { action } from "../_generated/server";
import { v } from "convex/values";

export const testMapplsReverseGeocodeAction = action({
  args: {
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("=== STARTING CONVEX MAPPLS GEOCODE TEST ===");
    console.log(`Input coordinates: lat=${args.lat}, lng=${args.lng}`);
    
    const staticKey = process.env.NEXT_PUBLIC_MAPPLS_REST_KEY || process.env.MAPPLS_REST_KEY;
    
    if (!staticKey) {
      throw new Error("MAPPLS_REST_KEY or NEXT_PUBLIC_MAPPLS_REST_KEY not configured in Convex dashboard.");
    }
    
    console.log("Using static REST key.");
    
    // Call search.mappls.com reverse geocode (works with static key)
    const geocodeUrl = `https://search.mappls.com/search/address/rev-geocode?lat=${args.lat}&lng=${args.lng}&access_token=${staticKey}`;
    const geoRes = await fetch(geocodeUrl);
    
    if (!geoRes.ok) {
      const err = await geoRes.text();
      throw new Error(`Geocode request failed (${geoRes.status}): ${err}`);
    }
    const geoData = await geoRes.json();
    const result = geoData.results?.[0];
    
    if (!result) {
      throw new Error("No address found from coordinates");
    }
    
    const eLoc = result.eLoc || result.eloc || "";
    
    console.log("Mappls API response success.");
    console.log("Resolved address:", result.formatted_address);
    console.log("eLoc:", eLoc);
    console.log("Pincode:", result.pincode);
    console.log("Locality:", result.locality);
    console.log("City:", result.city);
    console.log("State:", result.state);
    
    return {
      success: true,
      formattedAddress: result.formatted_address || "",
      pincode: result.pincode || "",
      locality: result.locality || "",
      city: result.city || "",
      state: result.state || "",
      eLoc,
    };
  }
});
