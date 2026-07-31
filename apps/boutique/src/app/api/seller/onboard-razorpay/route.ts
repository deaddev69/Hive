import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get Boutique details from Convex by Clerk userId
    const boutique = await convex.query(api.boutiques.getBoutiqueByClerkId, { clerkId: userId });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique profile not found" }, { status: 404 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const clerkSecret = process.env.CLERK_SECRET_KEY;

    if (!keyId || !keySecret || !clerkSecret) {
      return NextResponse.json({ error: "Credentials not configured on server" }, { status: 500 });
    }

    const authHeader = "Basic " + btoa(`${keyId}:${keySecret}`);
    
    // Construct redirect URL back to Money dashboard
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const redirectUrl = `${protocol}://${host}/boutique/money?status=kyc_pending`;

    let accountId = boutique.razorpayAccountId;

    // 2. Create Razorpay Account if it does not exist
    if (!accountId) {
      const accountResponse = await fetch("https://api.razorpay.com/v2/accounts", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: boutique.email,
          phone: boutique.phone || "9999999999",
          type: "route",
          reference_id: boutique._id,
          legal_business_name: boutique.boutiqueName,
          business_type: "individual",
          profile: {
            category: "fashion_and_apparel",
          },
        }),
      });

      if (!accountResponse.ok) {
        const err = await accountResponse.json();
        return NextResponse.json(
          { error: err.error?.description || "Failed to create Razorpay account" },
          { status: accountResponse.status }
        );
      }

      const accountData = await accountResponse.json();
      const newAccountId: string = accountData.id;
      accountId = newAccountId;

      // Save returned accountId to Convex
      await convex.mutation(api.boutiques.updateBoutiqueRazorpayOnboarding, {
        secret: clerkSecret,
        boutiqueId: boutique._id,
        razorpayAccountId: newAccountId,
        kycStatus: "created",
      });
    }

    const activeAccountId = accountId as string;

    // 3. Request dynamic Onboarding Link
    const linkResponse = await fetch(`https://api.razorpay.com/v2/accounts/${activeAccountId}/onboarding_links`, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        redirect_url: redirectUrl,
      }),
    });

    if (!linkResponse.ok) {
      const err = await linkResponse.json();
      return NextResponse.json(
        { error: err.error?.description || "Failed to generate onboarding link" },
        { status: linkResponse.status }
      );
    }

    const linkData = await linkResponse.json();
    return NextResponse.json({ redirectUrl: linkData.url });

  } catch (err: any) {
    console.error("Razorpay onboarding route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
