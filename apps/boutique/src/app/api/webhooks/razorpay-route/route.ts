import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../../convex/_generated/api";
import crypto from "crypto";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_ROUTE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_ROUTE_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // Verify Razorpay Webhook Signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("Invalid webhook signature received");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const { event, account_id } = payload;

    if (!account_id) {
      return NextResponse.json({ error: "Missing account_id in payload" }, { status: 400 });
    }

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) {
      console.error("CLERK_SECRET_KEY is not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // Handle Route Account KYC Status Webhook events
    let kycStatus: "activated" | "under_review" | "needs_clarification" | null = null;

    if (event === "account.activated") {
      kycStatus = "activated";
    } else if (event === "account.under_review") {
      kycStatus = "under_review";
    } else if (event === "account.needs_clarification") {
      kycStatus = "needs_clarification";
    }

    if (kycStatus) {
      console.log(`Updating boutique Razorpay Account ${account_id} KYC status to ${kycStatus}`);
      await convex.mutation(api.boutiques.updateBoutiqueKycStatus, {
        secret: clerkSecret,
        razorpayAccountId: account_id,
        kycStatus,
      });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Razorpay Route webhook handler error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
