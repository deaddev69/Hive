// apps/customer/src/lib/homeMerge.test.ts
// Tests for the Home personalisation merge (Phase 1 composition/personalisation split).
//
// Run with: npx tsx apps/customer/src/lib/homeMerge.test.ts

import { mergePersonalizedBlocks } from "./homeMerge";

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

const p = (id: string) => ({ id });
const ids = (blocks: any[] | undefined, blockId: string) =>
  (blocks?.find((b) => b.id === blockId)?.data?.products ?? []).map((x: any) => x.id);

function blocks() {
  return [
    { id: "rv", blockType: "recentlyViewed", data: { products: [p("f1"), p("f2"), p("f3")], isPersonalized: false } },
    { id: "na", blockType: "smartRail", data: { products: [p("n1"), p("n2")], isPersonalized: false } },
  ];
}

// ── Signed-out / overlay absent ──────────────────────────────────────────────
assertEqual("null overlay returns composition untouched", mergePersonalizedBlocks(blocks(), null), blocks());
assertEqual("undefined overlay (still loading) returns composition", mergePersonalizedBlocks(blocks(), undefined), blocks());
assertEqual("undefined blocks stays undefined", mergePersonalizedBlocks(undefined, null), undefined);
assertEqual("empty overlay object leaves blocks unchanged", mergePersonalizedBlocks(blocks(), {}), blocks());

// ── Overlay replaces only its own blocks ─────────────────────────────────────
{
  const merged = mergePersonalizedBlocks(blocks(), {
    rv: { products: [p("h1"), p("h2"), p("h3")], isPersonalized: true },
  });
  assertEqual("personalised block is replaced", ids(merged, "rv"), ["h1", "h2", "h3"]);
  assertEqual("non-personalised block is untouched", ids(merged, "na"), ["n1", "n2"]);
  assertEqual("isPersonalized flips true on overlaid block", merged?.find((b) => b.id === "rv")?.data?.isPersonalized, true);
  assertEqual("isPersonalized stays false elsewhere", merged?.find((b) => b.id === "na")?.data?.isPersonalized, false);
}

// ── Card count is preserved (no layout shift) ────────────────────────────────
{
  // Shopper viewed only one product; the rail rendered three as a guest.
  const merged = mergePersonalizedBlocks(blocks(), { rv: { products: [p("h1")], isPersonalized: true } });
  assertEqual("short history is topped up to the original count", ids(merged, "rv"), ["h1", "f1", "f2"]);
  assertEqual("count matches the pre-overlay render", ids(merged, "rv").length, 3);
}
{
  // Overlay longer than the fallback grows the rail rather than truncating history.
  const merged = mergePersonalizedBlocks(blocks(), {
    rv: { products: [p("h1"), p("h2"), p("h3"), p("h4"), p("h5")], isPersonalized: true },
  });
  assertEqual("longer overlay is not truncated to fallback length", ids(merged, "rv"), ["h1", "h2", "h3", "h4", "h5"]);
}

// ── Dedupe WITHIN a block, overlap ACROSS blocks allowed ─────────────────────
{
  // A viewed product that also appears in the same block's fallback must not double up.
  const merged = mergePersonalizedBlocks(blocks(), { rv: { products: [p("f2")], isPersonalized: true } });
  assertEqual("fallback top-up skips a product already injected", ids(merged, "rv"), ["f2", "f1", "f3"]);
  assertEqual("no product repeats within the block", new Set(ids(merged, "rv")).size, ids(merged, "rv").length);
}
{
  // Deliberate design allowance: the same product may appear in a personalised block AND another
  // rail. Auto-rail vs auto-rail duplication is a composition defect; this is not.
  const merged = mergePersonalizedBlocks(blocks(), { rv: { products: [p("n1")], isPersonalized: true } });
  assertEqual("personalised block may overlap another rail", ids(merged, "rv")[0], "n1");
  assertEqual("the other rail is unaffected by that overlap", ids(merged, "na"), ["n1", "n2"]);
}
{
  const merged = mergePersonalizedBlocks(blocks(), {
    rv: { products: [p("h1"), p("h1"), p("h2")], isPersonalized: true },
  });
  assertEqual("duplicate ids inside the overlay itself are collapsed", ids(merged, "rv"), ["h1", "h2", "f1"]);
}

// ── Degenerate shapes ────────────────────────────────────────────────────────
{
  const merged = mergePersonalizedBlocks(blocks(), { rv: { products: [], isPersonalized: true } });
  assertEqual("empty overlay products leave the fallback intact", ids(merged, "rv"), ["f1", "f2", "f3"]);
}
{
  const noData = [{ id: "rv", blockType: "recentlyViewed" } as any];
  const merged = mergePersonalizedBlocks(noData, { rv: { products: [p("h1")], isPersonalized: true } });
  assertEqual("block without data still accepts an overlay", ids(merged, "rv"), ["h1"]);
}
{
  const merged = mergePersonalizedBlocks(blocks(), { ghost: { products: [p("x")], isPersonalized: true } });
  assertEqual("overlay for an unknown block id is ignored", merged, blocks());
}

console.log(`\nHome merge: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) throw new Error(`Home merge tests failed (${failed} failures)`);
