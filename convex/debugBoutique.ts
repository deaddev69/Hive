import { mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const callCreateBoutique = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      await ctx.runMutation(api.boutiques.createBoutique, {
        boutiqueName: "Test",
        ownerName: "Test Owner",
        email: "existing@test.com", // will trigger duplicate if exists, else we'll create it
        phone: "9999999999",
        address: "Test Address",
        city: "City",
        state: "State",
        pincode: "123456",
        latitude: 10,
        longitude: 10,
        deliveryRadiusKm: 10,
        description: "Desc",
        status: "PENDING",
      } as any);
      return "Success";
    } catch (e: any) {
      return {
        message: e.message,
        data: e.data,
        name: e.name,
      };
    }
  }
});
