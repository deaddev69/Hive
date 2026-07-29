import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { porterWebhookRouter } from "./routes/webhooks/porter.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());

// Capture raw body for signature-preserving forwarding
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "hive-express-proxy",
    targetConvexWebhook:
      process.env.CONVEX_PORTER_WEBHOOK_URL ||
      "https://standing-mosquito-377.convex.site/webhooks/porter",
    timestamp: new Date().toISOString(),
  });
});

// Porter Webhook Forwarding Router
// Mounts POST /v1/webhooks/porter
app.use("/v1/webhooks", porterWebhookRouter);

app.listen(PORT, () => {
  console.log(`[Hive Express Proxy] Running on port ${PORT}`);
  console.log(`[Hive Express Proxy] Porter webhook endpoint: POST http://localhost:${PORT}/v1/webhooks/porter`);
});
