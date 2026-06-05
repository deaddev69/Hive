// packages/utils/src/cloudinary.ts
// Cloudinary URL builder utilities (client-safe — no secrets)

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

/**
 * Build a Cloudinary CDN URL with transformation parameters
 */
export function cloudinaryUrl(
  publicId: string,
  options: {
    width?:   number;
    height?:  number;
    crop?:    "fill" | "fit" | "scale" | "pad" | "thumb";
    quality?: number | "auto";
    format?:  "auto" | "webp" | "jpg" | "png";
    gravity?: "auto" | "face" | "center";
  } = {}
): string {
  const {
    width,
    height,
    crop    = "fill",
    quality = "auto",
    format  = "auto",
    gravity = "auto",
  } = options;

  const transforms: string[] = [`q_${quality}`, `f_${format}`];

  if (width)   transforms.push(`w_${width}`);
  if (height)  transforms.push(`h_${height}`);
  if (width || height) {
    transforms.push(`c_${crop}`, `g_${gravity}`);
  }

  const t = transforms.join(",");
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${t}/${publicId}`;
}

/**
 * Build a Cloudinary video URL
 */
export function cloudinaryVideoUrl(
  publicId: string,
  options: { width?: number; quality?: number | "auto" } = {}
): string {
  const { width, quality = "auto" } = options;
  const transforms: string[] = [`q_${quality}`, "f_auto"];
  if (width) transforms.push(`w_${width}`);
  const t = transforms.join(",");
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${t}/${publicId}`;
}

/** Common product image sizes */
export const ProductImageSizes = {
  thumbnail: { width: 200, height: 200 },
  card:      { width: 400, height: 500 },
  detail:    { width: 800, height: 1000 },
  zoom:      { width: 1200, height: 1500 },
} as const;
