// apps/customer/src/lib/cloudflareImageLoader.ts
// Maps a next/image request onto a Cloudflare image transformation.
//
// Vercel's optimizer is not used: it began returning HTTP 402 once the account's transformation
// quota was spent, which broke every image that needed a fresh rendition while already-cached ones
// kept serving (see apps/customer/next.config.ts). Cloudflare sits in front of both the R2 media
// bucket and the site itself and performs the same work through /cdn-cgi/image/, so pointing
// next/image at it restores per-width sources without a second optimizer in the path.
//
// This module is deliberately free of Next imports so the mapping can be unit tested directly.
// Run the tests with: npx tsx apps/customer/src/lib/cloudflareImageLoader.test.ts

/**
 * Applied when a component does not request a quality of its own.
 *
 * next/image would otherwise fall back to 75. The stored media URLs built by convex/media/urls.ts
 * already serve product imagery at quality=80, so 75 would have quietly lowered it the day the
 * loader shipped. A component that passes an explicit `quality` still wins over this.
 */
export const DEFAULT_IMAGE_QUALITY = 80;

/** Hostname Cloudflare serves the R2 media bucket from. Mirrors convex/media/urls.ts. */
export const MEDIA_HOSTNAME = "cdn.hivenow.in";

const TRANSFORM_MARKER = "/cdn-cgi/image/";

export interface ImageLoaderArgs {
  src: string;
  width: number;
  quality?: number;
}

function transformParams(width: number, quality?: number): string {
  const q = quality ?? DEFAULT_IMAGE_QUALITY;
  return `format=auto,width=${width},quality=${q}`;
}

/**
 * True for sources that must be handed back untouched.
 *
 * The legacy pub-*.r2.dev endpoint is Cloudflare's development endpoint and runs no
 * transformations — a /cdn-cgi/image/ path there returns 404, verified against production — so
 * rewriting those would replace a working image with a broken one. Everything else here is either
 * not ours to rewrite (Unsplash, Convex file storage) or already inline (data/blob).
 */
function isPassThrough(src: string): boolean {
  if (!src) return true;
  if (src.startsWith("data:") || src.startsWith("blob:")) return true;
  if (src.includes(".r2.dev/")) return true;
  if (src.includes("images.unsplash.com")) return true;
  if (src.includes(".convex.cloud")) return true;
  return false;
}

/**
 * Replaces the parameters of a URL this project already built.
 *
 * convex/media/urls.ts hands components fully-formed
 * `/cdn-cgi/image/<params>/<objectKey>` URLs whose width was chosen from a semantic variant
 * ("card", "pdp", "original"). Once next/image is driving the width, that baked-in choice has to
 * give way to the width actually being rendered — so the existing parameter segment is rewritten
 * rather than a second one prepended, which would produce a nested, invalid path.
 */
function rewriteExistingTransform(src: string, width: number, quality?: number): string | null {
  const start = src.indexOf(TRANSFORM_MARKER);
  if (start === -1) return null;

  const paramsStart = start + TRANSFORM_MARKER.length;
  const paramsEnd = src.indexOf("/", paramsStart);
  if (paramsEnd === -1) return null;

  return src.slice(0, paramsStart) + transformParams(width, quality) + src.slice(paramsEnd);
}

/**
 * Builds the URL next/image should request for a given rendered width.
 *
 * Local paths are emitted relative to the site origin, which is itself behind Cloudflare, so
 * files in public/ are transformed too rather than being the one category served as stored.
 */
export function cloudflareImageLoader({ src, width, quality }: ImageLoaderArgs): string {
  if (isPassThrough(src)) return src;

  const rewritten = rewriteExistingTransform(src, width, quality);
  if (rewritten !== null) return rewritten;

  const params = transformParams(width, quality);

  // Root-relative asset out of public/.
  if (src.startsWith("/")) {
    return `${TRANSFORM_MARKER}${params}${src}`;
  }

  // Absolute URL. Only the media host and the site's own origin are behind a zone that can
  // transform; anything else is left alone rather than guessed at.
  let parsed: URL;
  try {
    parsed = new URL(src);
  } catch {
    return src;
  }

  if (parsed.hostname !== MEDIA_HOSTNAME) return src;

  const path = `${parsed.pathname}${parsed.search}`;
  return `${parsed.origin}${TRANSFORM_MARKER}${params}${path}`;
}

export default cloudflareImageLoader;
