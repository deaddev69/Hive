import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided for upload." }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = (process.env.R2_BUCKET_NAME || "hive-media").trim();
    let publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || process.env.R2_PUBLIC_DEV_URL || "https://assets.hivenow.in";
    if (!publicDomain.startsWith("http://") && !publicDomain.startsWith("https://")) {
      publicDomain = `https://${publicDomain}`;
    }

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { 
          error: "Cloudflare R2 credentials missing on server. Set CLOUDFLARE_ACCOUNT_ID (or R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in server environment variables." 
        },
        { status: 400 }
      );
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
    const key = `campaigns/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
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

    const publicUrl = `${publicDomain.replace(/\/$/, "")}/${key}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("R2 Upload Route Failure:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to Cloudflare R2." },
      { status: 500 }
    );
  }
}
