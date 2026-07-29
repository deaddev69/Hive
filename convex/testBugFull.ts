import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { hashInviteToken, generateInviteToken } from "./boutiques";

export const testInsertFull = mutation({
  args: {},
  handler: async (ctx) => {
    try {
      const email = `test${Date.now()}@test.com`;
      const phone = `+91 ${Math.floor(Math.random() * 10000000000)}`;
      
      const rawToken = generateInviteToken();
      const hashed = await hashInviteToken(rawToken);
      const now = Date.now();

      const boutiqueId = await ctx.db.insert("boutiques", {
        boutiqueName: "Test",
        ownerName: "Test Owner",
        email: email,
        phone: phone,
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
        createdAt: now,
        area: "Area",
        searchKeywords: [],
        serviceType: "ready_to_ship",
        ownerEmail: email,
        ownerUserId: undefined,
        staffEmail1: undefined,
        staffEmail2: undefined,
        inviteTokenHash: hashed,
        inviteStatus: "sent",
        inviteSentAt: now,
        inviteExpiresAt: now + 14 * 24 * 60 * 60 * 1000,
        inviteCreatedBy: undefined,
        activeApprovedProductCount: 0,
        whatsAppNotificationsEnabled: true,
        notificationPhone: phone,
        name: "Test",
        slug: "test" + Date.now(),
        phoneNumber: phone,
        addressDetails: {
          line1: "Test Address",
          city: "City",
          state: "State",
          pincode: "123456",
          lat: 10,
          lng: 10,
        }
      } as any);

      await ctx.db.insert("auditLogs", {
        actorRole: "admin",
        action: "boutique.created",
        entityType: "boutiques",
        entityId: boutiqueId,
        metadata: JSON.stringify({
          inviteEmail: email,
          boutiqueId: boutiqueId,
          status: "PENDING",
        }),
        createdAt: now,
      });

      return "Success";
    } catch (e: any) {
      return "ERROR: " + e.message;
    }
  }
});
