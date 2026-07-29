import { Request, Response, Router } from "express";

export const porterWebhookRouter = Router();

const CONVEX_PORTER_WEBHOOK_URL =
  process.env.CONVEX_PORTER_WEBHOOK_URL ||
  (process.env.CONVEX_SITE_URL
    ? `${process.env.CONVEX_SITE_URL}/webhooks/porter`
    : "https://standing-mosquito-377.convex.site/webhooks/porter");

/**
 * POST /v1/webhooks/porter
 *
 * Thin forwarding proxy for Porter logistics webhooks.
 * Preserves raw payload and headers, forwarding directly to Convex backend.
 */
porterWebhookRouter.post("/porter", async (req: Request, res: Response): Promise<void> => {
  const timestamp = new Date().toISOString();
  console.log(`[Express Proxy] [${timestamp}] Incoming Porter webhook -> POST /v1/webhooks/porter`);

  try {
    // 1. Preserve raw body or stringified JSON payload without modification
    const rawBody = (req as any).rawBody || req.body;
    let bodyData: BodyInit;
    if (Buffer.isBuffer(rawBody)) {
      bodyData = new Uint8Array(rawBody);
    } else if (typeof rawBody === "string") {
      bodyData = rawBody;
    } else {
      bodyData = JSON.stringify(rawBody);
    }

    // 2. Prepare headers to forward (Content-Type, x-api-key)
    const headersToForward: Record<string, string> = {
      "content-type": (req.headers["content-type"] as string) || "application/json",
    };

    const apiKeyHeader = req.headers["x-api-key"];
    if (apiKeyHeader) {
      headersToForward["x-api-key"] = apiKeyHeader as string;
    }

    // 3. Forward request to Convex production webhook endpoint
    const convexResponse = await fetch(CONVEX_PORTER_WEBHOOK_URL, {
      method: "POST",
      headers: headersToForward,
      body: bodyData,
    });

    const responseText = await convexResponse.text();

    if (!convexResponse.ok) {
      console.error(
        `[Express Proxy Warning] Convex rejected webhook forwarding. Status: ${convexResponse.status}. Response: ${responseText}`
      );
    } else {
      console.log(
        `[Express Proxy Success] Webhook forwarded to Convex successfully. Status: ${convexResponse.status}`
      );
    }

    // 4. Mirror exact HTTP status code and response headers from Convex back to Porter
    res.status(convexResponse.status);

    const convexContentType = convexResponse.headers.get("content-type");
    if (convexContentType) {
      res.setHeader("content-type", convexContentType);
    }

    res.send(responseText);
  } catch (error: any) {
    console.error(`[Express Proxy Error] Webhook forwarding failure:`, error?.message || error);

    // Return 502 Bad Gateway for forwarding network/fetch failures
    res.status(502).json({
      error: "Bad Gateway",
      message: "Failed to forward webhook request to backend service",
    });
  }
});
