/**
 * Merges the per-shopper personalisation overlay over the shared Home composition.
 *
 * Home is served as two queries: `resolveExperiencePayload` carries no identity and is therefore
 * identical for every shopper in a location cell, and `getPersonalizedBlocks` returns only the
 * blocks that genuinely need identity. The client joins them by block id.
 *
 * Kept as a pure function so the merge rules — which products win, how many cards render, what
 * happens for a signed-out shopper — can be tested without React or Convex.
 */

export interface MergeableBlock {
  id: string;
  data?: { products?: Array<{ id: string }>; isPersonalized?: boolean; [k: string]: any };
  [k: string]: any;
}

export type PersonalizedOverlay = Record<
  string,
  { products: Array<{ id: string }>; isPersonalized: boolean }
> | null | undefined;

export function mergePersonalizedBlocks<T extends MergeableBlock>(
  blocks: T[] | undefined,
  overlay: PersonalizedOverlay
): T[] | undefined {
  if (!blocks || !overlay) return blocks;

  return blocks.map((block) => {
    const injected = overlay[block.id];
    if (!injected?.products?.length) return block;

    // Preserve the card count the composition already rendered. A shopper whose history is
    // shorter than the rail would otherwise watch the row shrink when the overlay lands — a
    // layout shift above the fold. Personalised products lead; the guest fallback tops up the
    // remainder, skipping anything already shown.
    const fallback = block.data?.products ?? [];
    const targetCount = Math.max(fallback.length, injected.products.length);

    const seen = new Set<string>();
    const merged: Array<{ id: string }> = [];
    // Dedupe WITHIN the block. Overlap with other Home rails is accepted by design — a product
    // the shopper actually viewed may legitimately also appear in New Arrivals — but a block must
    // never repeat a product against itself.
    for (const p of injected.products) {
      if (merged.length >= targetCount) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }
    for (const p of fallback) {
      if (merged.length >= targetCount) break;
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }

    return { ...block, data: { ...block.data, products: merged, isPersonalized: true } };
  });
}
