import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const testInsert = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      await ctx.db.insert("boutiques", {
        boutiqueName: "Test",
        ownerName: "Test Owner",
        email: "test@test.com",
        phone: "+91 9999999999",
        address: "Test Address",
        latitude: 10,
        longitude: 10,
        city: "City",
        state: "State",
        pincode: "123456",
        deliveryRadiusKm: 10,
        description: "Desc",
        status: "PENDING",
        storeCategory: "women_fashion",
        sellerModel: "boutique",
        merchantTier: "Bronze",
        createdAt: Date.now(),
        area: "Area",
        searchKeywords: [],
        serviceType: "ready_to_ship",
        ownerEmail: "test@test.com",
        ownerUserId: undefined,
        staffEmail1: undefined,
        staffEmail2: undefined,
        inviteTokenHash: "hash",
        inviteStatus: "sent",
        inviteSentAt: Date.now(),
        inviteExpiresAt: Date.now() + 1000,
        inviteCreatedBy: undefined,
        activeApprovedProductCount: 0,
        whatsAppNotificationsEnabled: true,
        notificationPhone: "+91 9999999999",
        name: "Test",
        slug: "test",
        phoneNumber: "+91 9999999999",
        addressDetails: {
          line1: "Test Address",
          city: "City",
          state: "State",
          pincode: "123456",
          lat: 10,
          lng: 10,
        }
      } as any);
      return "Success";
    } catch (e: any) {
      return e.message;
    }
  }
});
