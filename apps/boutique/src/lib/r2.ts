import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/**
 * Upload a customer push banner image directly to Cloudflare R2.
 */
export async function uploadBannerToR2(file: File): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "hive-assets";
  const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DEV_URL || "https://assets.hivenow.in";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("Cloudflare R2 credentials missing. Using object URL fallback.");
    return URL.createObjectURL(file);
  }

  const R2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  const fileExtension = file.name.split(".").pop() || "jpg";
  const key = `push-banners/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const arrayBuffer = await file.arrayBuffer();

  await R2.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: file.type,
      CacheControl: "public, max-age=31536000",
    })
  );

  return `${publicDomain.replace(/\/$/, "")}/${key}`;
}
