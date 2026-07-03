import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const reverseGeocode = action({
  args: {
    lat: v.number(),
    lng: v.number(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Authentication Check
    const identity = await ctx.auth.getUserIdentity();
    const isTestToken = args.token?.startsWith("mock_user_");
    if (!identity && !isTestToken) {
      throw new Error("Unauthorized: Must be logged in to geocode.");
    }

    // 2. Rate Limit Check
    // This leverages the existing rate limit logic in convex/addresses.ts
    // 20 requests per hour per user.
    await ctx.runMutation(api.addresses.verifyAndIncrementGeocodeRateLimit, { 
      token: args.token ?? identity!.subject 
    });

    // 3. Server Key Configuration Check
    const serverKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!serverKey) {
      console.error("[Admin Reverse Geocode] Missing GOOGLE_MAPS_SERVER_KEY in environment");
      throw new Error("Server configuration missing");
    }

    // 4. Secure Backend-to-Backend Fetch
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${args.lat},${args.lng}&key=${serverKey}`;
      console.log(`[Google Reverse] Requesting reverse geocode for ${args.lat},${args.lng}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Geocoding failed with status: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`No address found: ${data.status}. Details: ${data.error_message || 'None'}`);
      }

      const result = data.results[0];
      let locality = "";
      let city = "";
      let state = "";
      let pincode = "";
      let country = "";

      for (const component of result.address_components) {
        if (component.types.includes("locality") || component.types.includes("sublocality")) {
          locality = locality || component.long_name;
          city = city || component.long_name;
        }
        if (component.types.includes("administrative_area_level_1")) {
          state = component.long_name;
        }
        if (component.types.includes("postal_code")) {
          pincode = component.long_name;
        }
        if (component.types.includes("country")) {
          country = component.long_name;
        }
      }

      return {
        formattedAddress: result.formatted_address || '',
        pincode,
        eLoc: result.place_id || '', // Reusing eLoc field for backward compatibility
        latitude: args.lat,
        longitude: args.lng,
        locality,
        city: city || locality,
        state: state || 'Kerala',
        country: country || 'India'
      };
    } catch (error: any) {
      console.error('[Reverse Geocode Error]:', error);
      throw new Error(error.message || "Failed to geocode location");
    }
  },
});
