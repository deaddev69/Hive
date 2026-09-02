// convex/media/urls.ts
// Single source of truth for public image delivery URLs.
//
// Kept in its own dependency-free module (rather than inside media/api.ts) so
// callers such as reservations.ts can build URLs without pulling the AWS S3
// client and the rest of the upload pipeline into their bundle. media/api.ts
// re-exports getPublicUrl, so every existing `from "./media/api"` import
// continues to work unchanged.

/**
 * Public hostname images are served from.
 *
 * Production is the Cloudflare custom domain bound to the `hive-media` R2
 * bucket. It is NOT the `pub-*.r2.dev` endpoint: that one is Cloudflare's
 * development endpoint, is rate limited, and — critically — does not run
 * `/cdn-cgi/image/` transformations, so every image served through it arrives
 * at its full uploaded size (up to the 10 MB upload cap) no matter what
 * variant the caller asked for.
 *
 * Overridable per deployment via the Convex environment variable
 * R2_PUBLIC_DOMAIN. Set with a bare hostname (no scheme, no trailing slash).
 */
const DEFAULT_PUBLIC_DOMAIN = "cdn.hivenow.in";

function resolveDomain(): string {
  const configured = process.env.R2_PUBLIC_DOMAIN?.trim();
  if (!configured) return DEFAULT_PUBLIC_DOMAIN;
  return configured.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/**
 * Semantic image sizes. Each maps to explicit Cloudflare transformation
 * parameters below — deliberately NOT to named Cloudflare transformations,
 * which would live only in the dashboard and nowhere in version control.
 *
 * "original" applies format negotiation but no resize.
 */
export type ImageVariant = "thumbnail" | "card" | "pdp" | "original";

/**
 * Widths are derived from what the consuming components actually render, at up
 * to ~3x device pixel ratio. Cloudflare's default `fit` is scale-down, so a
 * width only ever shrinks an image — a source smaller than the target is
 * passed through untouched rather than upscaled.
 *
 *  thumbnail  Boutique logos (ProductInfo.tsx:411, MobileProductDetails.tsx:413,
 *             shop/[slug]/page.tsx:81) and the PDP gallery's thumb strip, which
 *             is `w-14` (56 CSS px) at ProductGallery.tsx:406. 320 covers all of
 *             these at 3x.
 *
 *  card       Product grid cards. ProductCard.tsx:176 declares
 *             `sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"`,
 *             whose largest real request is ~650 px (50vw of a 430 px viewport
 *             at 3x). These go through next/image, which builds its own srcSet
 *             from this source, so 800 leaves headroom without shipping PDP-
 *             sized bytes to a grid.
 *
 *  pdp        The PDP gallery hero, which is a raw <img> (ProductGallery.tsx:313
 *             desktop, :366 mobile) — no next/image in the path, so this width
 *             is exactly what the shopper downloads. It is also the source for
 *             the hover-zoom at ProductGallery.tsx:306-318, which scales the
 *             image beyond its layout box, so it needs headroom above the
 *             ~500 px desktop / ~430 px mobile display width. 1200 gives roughly
 *             2x on desktop and ~2.8x on mobile.
 *
 *  original   Banners and boutique cover art, rendered full-bleed at
 *             `sizes="100vw"`. Resizing here would cap the hero on large
 *             displays, so only the format is negotiated.
 */
const VARIANT_PARAMS: Record<ImageVariant, string> = {
  thumbnail: "format=auto,width=320,quality=80",
  card: "format=auto,width=800,quality=80",
  pdp: "format=auto,width=1200,quality=82",
  original: "format=auto",
};

/**
 * Builds the public delivery URL for a stored image asset.
 *
 * Accepts either an ImageAsset object (uses its objectKey) or a plain string.
 * A string is returned as-is: some rows store a fully-formed URL from before
 * ImageAsset existed, and those already point at the canonical domain.
 */
export function getPublicUrl(asset: any, variant: ImageVariant = "original"): string {
  if (typeof asset === "string") return asset;
  if (!asset?.objectKey) return "";

  const domain = resolveDomain();
  const objectKey = String(asset.objectKey).replace(/^\/+/, "");

  // The r2.dev development endpoint serves no transformations, so emit a plain
  // object URL there rather than a /cdn-cgi/image/ path that would 404.
  if (domain.includes(".r2.dev")) {
    return `https://${domain}/${objectKey}`;
  }

  const params = VARIANT_PARAMS[variant] ?? VARIANT_PARAMS.original;
  return `https://${domain}/cdn-cgi/image/${params}/${objectKey}`;
}
