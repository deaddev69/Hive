import { NextRequest, NextResponse } from "next/server";

const CUSTOMER_APP_URL = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL || "https://hivenow.in";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, token } = body;

    if (!orderId || !token) {
      return NextResponse.json({ error: "orderId and token are required" }, { status: 400 });
    }

    const res = await fetch(`${CUSTOMER_APP_URL}/api/invoices/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId, token }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Failed to generate invoice via customer API: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[Boutique API Invoices Generate Proxy] Error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
