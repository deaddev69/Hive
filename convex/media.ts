// @ts-nocheck
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAuthenticatedUser } from "./lib/auth";

// Define the standard S3 Client for Cloudflare R2
const getR2Client = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing Cloudflare R2 credentials in environment variables");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
};

/**
 * Generate a secure presigned upload URL for Cloudflare R2.
 */
export const generateUploadUrl = action({
  args: {
    token: v.optional(v.string()),
    mimeType: v.string(),
    fileSize: v.number(),
    context: v.union(
      v.literal("product"),
      v.literal("boutique_logo"),
      v.literal("boutique_banner"),
      v.literal("category"),
      v.literal("banner"),
      v.literal("invoice")
    ),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    const user = await getAuthenticatedUser(ctx, args.token);

    // 2. Validate MIME type
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];
    if (!allowedMimeTypes.includes(args.mimeType)) {
      throw new Error("Unsupported file type. Allowed types: jpeg, png, webp, avif, pdf.");
    }
    
    // Prevent SVG uploads to mitigate XSS
    if (args.mimeType.includes("svg") || args.mimeType.includes("html")) {
      throw new Error("SVGs and HTML files are strictly prohibited for security reasons.");
    }

    // 3. Validate size (e.g. max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (args.fileSize > MAX_SIZE) {
      throw new Error("File exceeds the 10MB maximum limit.");
    }

    // 4. Generate unique keys and versions
    const bucket = (process.env.R2_BUCKET_NAME || "hive-media").trim();
    const uuid = crypto.randomUUID();
    const version = "v1";
    const extension = args.mimeType.split("/")[1] || "bin";
    const objectKey = `${args.context}s/${uuid}/${version}/original.${extension}`;

    // 5. Generate presigned URL
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: args.mimeType,
      ContentLength: args.fileSize,
    });

    // URL valid for 5 minutes
    const presignedUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return {
      presignedUrl,
      assetData: {
        assetId: uuid,
        storageProvider: "cloudflare-r2",
        bucket,
        objectKey,
        mime: args.mimeType,
        size: args.fileSize,
      }
    };
  },
});

/**
 * Delete an object from Cloudflare R2. 
 * This is an internal action meant to be called by the cleanup cron job.
 */
export const deleteObjectInternal = internalAction({
  args: {
    objectKey: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = (process.env.R2_BUCKET_NAME || "hive-media").trim();
    const client = getR2Client();

    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: args.objectKey,
    });

    try {
      await client.send(command);
      console.log(`[Media] Successfully deleted object from R2: ${args.objectKey}`);
    } catch (error) {
      console.error(`[Media] Failed to delete object from R2: ${args.objectKey}`, error);
      throw error;
    }
  }
});
