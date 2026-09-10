// apps/customer/src/lib/catalogEmptyState.test.ts
//
// Tests for Phase B2: Three-state empty reason resolution.
//
// Run with: npx tsx apps/customer/src/lib/catalogEmptyState.test.ts

import { resolveEmptyStateReason } from "./catalogEmptyState";

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

// ── 1. Global Zero -> coming_soon ────────────────────────────────────────────
assertEqual(
  "globalCount === 0 with known location -> coming_soon",
  resolveEmptyStateReason({
    currentGlobalCount: 0,
    currentServiceableCount: 0,
    hasKnownLocation: true,
  }),
  "coming_soon",
);

assertEqual(
  "globalCount === 0 without known location -> coming_soon",
  resolveEmptyStateReason({
    currentGlobalCount: 0,
    currentServiceableCount: 0,
    hasKnownLocation: false,
  }),
  "coming_soon",
);

assertEqual(
  "globalCount === 0 during browseAll -> coming_soon",
  resolveEmptyStateReason({
    currentGlobalCount: 0,
    currentServiceableCount: 0,
    hasKnownLocation: false,
  }),
  "coming_soon",
);

// ── 2. Location Zero -> location ─────────────────────────────────────────────
assertEqual(
  "globalCount > 0, location known, serviceableCount === 0 -> location",
  resolveEmptyStateReason({
    currentGlobalCount: 15,
    currentServiceableCount: 0,
    hasKnownLocation: true,
  }),
  "location",
);

// ── 3. Filters Zero -> filters ───────────────────────────────────────────────
assertEqual(
  "globalCount > 0, location known, serviceableCount > 0 -> filters",
  resolveEmptyStateReason({
    currentGlobalCount: 15,
    currentServiceableCount: 5,
    hasKnownLocation: true,
  }),
  "filters",
);

assertEqual(
  "globalCount > 0, location unknown, serviceableCount === 0 -> filters (location not blamed)",
  resolveEmptyStateReason({
    currentGlobalCount: 15,
    currentServiceableCount: 0,
    hasKnownLocation: false,
  }),
  "filters",
);

assertEqual(
  "globalCount > 0, browseAll active (hasKnownLocation false) -> filters",
  resolveEmptyStateReason({
    currentGlobalCount: 15,
    currentServiceableCount: 15,
    hasKnownLocation: false,
  }),
  "filters",
);

// ── 4. Hierarchy still loading (null counts) -> filters fallback ──────────────
assertEqual(
  "counts still loading (null) -> filters fallback",
  resolveEmptyStateReason({
    currentGlobalCount: null,
    currentServiceableCount: null,
    hasKnownLocation: true,
  }),
  "filters",
);

console.log(`\nCatalog Empty State Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
