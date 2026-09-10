// apps/customer/src/lib/cloudflareImageLoader.test.ts
// Tests for the Cloudflare image loader that replaces Vercel's optimizer.
//
// This mapping runs for every image on the customer site, so a mistake here is not a degraded
// image but a broken one, everywhere at once. The cases below pin the two failure modes that
// would do that: rewriting a host that cannot transform, and prepending a second transform
// segment onto a URL that already carries one.
//
// Run with: npx tsx apps/customer/src/lib/cloudflareImageLoader.test.ts

import {
  cloudflareImageLoader,
  buildImageUrl,
  DEFAULT_IMAGE_QUALITY,
  MEDIA_HOSTNAME,
} from "./cloudflareImageLoader";

let passed = 0;
let failed = 0;

function assertEqual(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(`[FAIL] ${name}\n  expected ${e}\n  actual   ${a}`);
  }
}

function assertTrue(name: string, actual: boolean) {
  assertEqual(name, actual, true);
}

const KEY = "product_images/abc123/v1/original.jpg";
const MEDIA = `https://${MEDIA_HOSTNAME}`;

// ── Defaults ─────────────────────────────────────────────────────────────────
{
  assertEqual("default quality is 80, not next/image's 75", DEFAULT_IMAGE_QUALITY, 80);
}

// ── Local public/ assets ─────────────────────────────────────────────────────
{
  assertEqual(
    "root-relative asset is transformed on the site origin",
    cloudflareImageLoader({ src: "/hive-logo-gold-trimmed.png", width: 256 }),
    "/cdn-cgi/image/format=auto,width=256,quality=80/hive-logo-gold-trimmed.png"
  );

  // customer-logo.png is referenced with a cache-busting query.
  assertEqual(
    "query string on a local asset is preserved",
    cloudflareImageLoader({ src: "/customer-logo.png?v=2", width: 128 }),
    "/cdn-cgi/image/format=auto,width=128,quality=80/customer-logo.png?v=2"
  );

  assertTrue(
    "local result stays relative so it resolves on whichever origin serves the page",
    cloudflareImageLoader({ src: "/logo.png", width: 64 }).startsWith("/cdn-cgi/image/")
  );
}

// ── Media host without an existing transform ─────────────────────────────────
{
  assertEqual(
    "plain media URL gains a transform segment",
    cloudflareImageLoader({ src: `${MEDIA}/${KEY}`, width: 800 }),
    `${MEDIA}/cdn-cgi/image/format=auto,width=800,quality=80/${KEY}`
  );
}

// ── Media host WITH an existing transform (the real production shape) ────────
{
  // What convex/media/urls.ts actually emits for the "card" variant.
  const existing = `${MEDIA}/cdn-cgi/image/format=auto,width=800,quality=80/${KEY}`;

  assertEqual(
    "existing params are replaced, not nested",
    cloudflareImageLoader({ src: existing, width: 384 }),
    `${MEDIA}/cdn-cgi/image/format=auto,width=384,quality=80/${KEY}`
  );

  const result = cloudflareImageLoader({ src: existing, width: 384 });
  assertEqual("exactly one transform segment survives", result.split("/cdn-cgi/image/").length - 1, 1);
  assertTrue("the object key is left intact", result.endsWith(`/${KEY}`));

  // The "original" variant carries no width at all; the loader must still impose one.
  assertEqual(
    "width is imposed on the unsized original variant",
    cloudflareImageLoader({ src: `${MEDIA}/cdn-cgi/image/format=auto/banner_images/x/v1/original.png`, width: 1080 }),
    `${MEDIA}/cdn-cgi/image/format=auto,width=1080,quality=80/banner_images/x/v1/original.png`
  );

  // Applying the loader twice must be a no-op beyond the width, since Next may re-enter it.
  const once = cloudflareImageLoader({ src: existing, width: 640 });
  const twice = cloudflareImageLoader({ src: once, width: 640 });
  assertEqual("mapping is idempotent", twice, once);
}

// ── Quality handling ─────────────────────────────────────────────────────────
{
  assertTrue(
    "explicit quality from a component is preserved",
    cloudflareImageLoader({ src: `${MEDIA}/${KEY}`, width: 800, quality: 95 }).includes("quality=95")
  );
  assertTrue(
    "omitted quality falls back to the project default",
    cloudflareImageLoader({ src: `${MEDIA}/${KEY}`, width: 800 }).includes("quality=80")
  );
  assertTrue(
    "an explicit quality also overrides one already baked into the URL",
    cloudflareImageLoader({
      src: `${MEDIA}/cdn-cgi/image/format=auto,width=800,quality=80/${KEY}`,
      width: 800,
      quality: 60,
    }).includes("quality=60")
  );
  assertTrue(
    "quality=0 is honoured rather than treated as absent",
    cloudflareImageLoader({ src: `${MEDIA}/${KEY}`, width: 800, quality: 0 }).includes("quality=0")
  );
}

// ── Pass-through hosts ───────────────────────────────────────────────────────
{
  // Verified against production: /cdn-cgi/image/ on the r2.dev development endpoint returns 404,
  // so rewriting these would turn working images into broken ones.
  const legacy = "https://pub-09a817ec6f384c4997feafc5e8387286.r2.dev/product_images/9a2f/v1/original.jpg";
  assertEqual("legacy r2.dev endpoint is untouched", cloudflareImageLoader({ src: legacy, width: 800 }), legacy);

  const unsplash = "https://images.unsplash.com/photo-1441986300917?auto=format&w=600";
  assertEqual("unsplash is untouched", cloudflareImageLoader({ src: unsplash, width: 400 }), unsplash);

  const convex = "https://benevolent-seahorse-336.convex.cloud/api/storage/abc";
  assertEqual("convex storage is untouched", cloudflareImageLoader({ src: convex, width: 400 }), convex);

  const data = "data:image/png;base64,iVBORw0KGgo=";
  assertEqual("data URI is untouched", cloudflareImageLoader({ src: data, width: 400 }), data);

  const blob = "blob:https://hivenow.in/9a2f-1234";
  assertEqual("blob URL is untouched", cloudflareImageLoader({ src: blob, width: 400 }), blob);

  const other = "https://example.com/some/photo.jpg";
  assertEqual("an unknown host is untouched", cloudflareImageLoader({ src: other, width: 400 }), other);

  assertEqual("empty src is untouched", cloudflareImageLoader({ src: "", width: 400 }), "");
}

// ── Width is what next/image asked for ───────────────────────────────────────
{
  for (const w of [16, 64, 256, 640, 828, 1080, 1920, 3840]) {
    const out = cloudflareImageLoader({ src: `${MEDIA}/${KEY}`, width: w });
    if (!out.includes(`width=${w},`)) {
      failed++;
      console.error(`[FAIL] width ${w} not carried into the URL: ${out}`);
    }
  }
  passed++;
  console.log("[PASS] every requested width reaches the transform");
}

// ── Origins that cannot transform ────────────────────────────────────────────
{
  // Only a local origin is affected, and only for files out of public/. Rewriting those to
  // /cdn-cgi/image/ on localhost points them at a path Next has no route for, so every logo and
  // static asset 404s while developing — observed in a dev browser before this branch existed.
  const dev = { originIsBehindCloudflare: false };
  const prod = { originIsBehindCloudflare: true };

  assertEqual(
    "public/ asset is served as stored when the origin cannot transform",
    buildImageUrl({ src: "/hive-logo-gold-trimmed.png", width: 256 }, dev),
    "/hive-logo-gold-trimmed.png"
  );
  assertEqual(
    "its query string survives untouched",
    buildImageUrl({ src: "/customer-logo.png?v=2", width: 128 }, dev),
    "/customer-logo.png?v=2"
  );
  assertEqual(
    "the same asset is transformed on a deployed origin",
    buildImageUrl({ src: "/hive-logo-gold-trimmed.png", width: 256 }, prod),
    `/cdn-cgi/image/format=auto,width=256,quality=${DEFAULT_IMAGE_QUALITY}/hive-logo-gold-trimmed.png`
  );

  // The media host is reached over the network, so it transforms in development exactly as it
  // does in production. Only the site's own origin changes behaviour.
  const mediaSrc = `https://${MEDIA_HOSTNAME}/product_images/abc/v1/original.png`;
  assertEqual(
    "the media host is unaffected by the origin",
    buildImageUrl({ src: mediaSrc, width: 800 }, dev),
    buildImageUrl({ src: mediaSrc, width: 800 }, prod)
  );
  assertEqual(
    "and still carries a transform in development",
    buildImageUrl({ src: mediaSrc, width: 800 }, dev).includes("/cdn-cgi/image/"),
    true
  );

  // Pass-through sources are decided before the origin is consulted.
  assertEqual(
    "a legacy r2.dev source is untouched either way",
    buildImageUrl({ src: "https://pub-abc.r2.dev/x.jpg", width: 640 }, dev),
    "https://pub-abc.r2.dev/x.jpg"
  );
}

console.log(`\nCloudflare image loader: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Cloudflare image loader tests failed (${failed} failures)`);
