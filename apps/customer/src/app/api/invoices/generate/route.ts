/**
 * POST /api/invoices/generate
 *
 * Server-side PDF generation endpoint.
 * Called fire-and-forget from the order success page immediately after order placement.
 *
 * Flow:
 *   1. Accept { orderId, token } in the request body
 *   2. Use the auth token to fetch the invoice from Convex (ownership-checked)
 *   3. Generate the PDF with pdf-lib (Node.js runtime)
 *   4. Upload the PDF bytes to Convex storage (using the same auth token)
 *   5. Patch invoice.pdfUrl via updateInvoicePdfUrl mutation
 *   6. Return { pdfUrl }
 *
 * This means the PDF exists in Convex storage before any user clicks "Download".
 * Admin and Boutique panels show the real download link immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/pdfGenerator";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;

// ── Convex HTTP API helpers ─────────────────────────────────────────────────

async function convexQuery(
  fnName: string,
  args: Record<string, unknown>,
  token: string
): Promise<any> {
  const res = await fetch(`${CONVEX_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ path: fnName, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex query ${fnName} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.status === "error" || json.error) {
    throw new Error(json.error || "Convex query error");
  }
  return json.value;
}

async function convexMutation(
  fnName: string,
  args: Record<string, unknown>,
  token: string
): Promise<any> {
  const res = await fetch(`${CONVEX_URL}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ path: fnName, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex mutation ${fnName} failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (json.status === "error" || json.error) {
    throw new Error(json.error || "Convex mutation error");
  }
  return json.value;
}

// ── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, token } = body as { orderId: string; token: string };

    if (!orderId || !token) {
      return NextResponse.json({ error: "orderId and token are required" }, { status: 400 });
    }

    // 1. Fetch invoice from Convex (ownership-checked by the query)
    let invoice = null;
    try {
      invoice = await convexQuery(
        "invoices:getInvoiceByOrderId",
        { orderId },
        token
      );
    } catch (e) {
      // If customer check fails, try boutique owner check
      invoice = await convexQuery(
        "invoices:getInvoiceByOrderId_boutique",
        { orderId },
        token
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found for this order" }, { status: 404 });
    }

    // 2. If PDF already exists, skip re-generation
    if (invoice.pdfUrl) {
      return NextResponse.json({ pdfUrl: invoice.pdfUrl, skipped: true });
    }

    // 3. Generate the PDF (pdf-lib runs fine in Next.js Node.js runtime)
    const origin = new URL(req.url).origin;
    const logoUrl = `${origin}/logo.png`;
    const blob = await generateInvoicePdf(invoice, logoUrl);
    const arrayBuffer = await blob.arrayBuffer();
    const pdfBytes = Buffer.from(arrayBuffer);

    // 4. Get a Convex storage upload URL
    const uploadUrl = await convexMutation(
      "invoices:generateUploadUrl",
      {},
      token
    );

    // 5. Upload the PDF bytes to Convex storage
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdfBytes,
    });

    if (!uploadRes.ok) {
      throw new Error(`Storage upload failed: ${uploadRes.status}`);
    }

    const { storageId } = await uploadRes.json();

    // 6. Persist the URL on the invoice record
    const result = await convexMutation(
      "invoices:updateInvoicePdfUrl",
      { invoiceId: invoice._id, storageId },
      token
    );

    return NextResponse.json({ pdfUrl: result?.pdfUrl ?? null, invoiceId: invoice._id });
  } catch (err: any) {
    console.error("[/api/invoices/generate] Error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
