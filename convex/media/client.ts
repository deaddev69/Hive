import { S3Client } from "@aws-sdk/client-s3";

export const getR2Client = () => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("Missing Cloudflare R2 credentials. Returning mock client for development.");
    return new S3Client({
      region: "auto",
      endpoint: `https://mock-account.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: "mock-key",
        secretAccessKey: "mock-secret",
      },
    });
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
