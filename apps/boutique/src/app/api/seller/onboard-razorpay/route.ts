// apps/boutique/src/app/api/seller/onboard-razorpay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../../convex/_generated/api";

// Firebase Admin SDK — initialized once at module scope
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || "hive-fashion",
    });
  } else {
    // Fallback: initialize with just project ID (works in GCP environments)
    initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "hive-fashion",
    });
  }
}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Firebase ID token from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 });
    }
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const sellerEmail = decodedToken.email;
    if (!sellerEmail) {
      return NextResponse.json({ error: "Token missing email claim" }, { status: 400 });
    }

    // 2. Look up boutique by seller's email (server-secret gated — not a public lookup)
    const lookupSecret = process.env.CONVEX_SERVER_SECRET || process.env.CLERK_SECRET_KEY;
    if (!lookupSecret) {
      return NextResponse.json({ error: "Server credentials not configured" }, { status: 500 });
    }
    const boutique = await convex.query(api.boutiques.getBoutiqueByEmail, { email: sellerEmail, secret: lookupSecret });
    if (!boutique) {
      return NextResponse.json({ error: "Boutique profile not found for this email" }, { status: 404 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const serverSecret = process.env.CONVEX_SERVER_SECRET || process.env.CLERK_SECRET_KEY;

    if (!keyId || !keySecret || !serverSecret) {
      return NextResponse.json({ error: "Server credentials not configured" }, { status: 500 });
    }

    const razorpayAuth = "Basic " + btoa(`${keyId}:${keySecret}`);

    // Construct redirect URL back to Money dashboard
    const host = req.headers.get("host") || "localhost:3002";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const redirectUrl = `${protocol}://${host}/boutique/money?status=kyc_pending`;

    let accountId = boutique.razorpayAccountId;

    // 3. Create Razorpay Account if it does not exist
    if (!accountId) {
      const accountResponse = await fetch("https://api.razorpay.com/v2/accounts", {
        method: "POST",
        headers: {
          Authorization: razorpayAuth,
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
        secret: serverSecret,
        boutiqueId: boutique._id,
        razorpayAccountId: newAccountId,
        kycStatus: "created",
      });
    }

    const activeAccountId = accountId as string;

    // 4. Request dynamic Onboarding Link
    const linkResponse = await fetch(`https://api.razorpay.com/v2/accounts/${activeAccountId}/onboarding_links`, {
      method: "POST",
      headers: {
        Authorization: razorpayAuth,
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
