// convex/lib/verticals.ts
// Backend helpers over the shared vertical registry.
//
// The registry itself (packages/types/src/verticals.ts) is data only. Anything
// that has to read a product, hit the database, or make a decision lives here.

// Type-only, so this module stays importable from a plain `tsx` test run
// without pulling the Convex server runtime in behind it.
import type { GenericDatabaseReader } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";
import {
  VERTICAL_TYPES,
  VerticalType,
  effectiveVerticalType,
  getVerticalConfig,
} from "../../packages/types/src/verticals";

type DbReader = GenericDatabaseReader<DataModel>;

export { effectiveVerticalType, getVerticalConfig };
export type { VerticalType };
export { VERTICAL_TYPES };

/**
 * The specification keys a product of this vertical may store in `details`.
 *
 * For apparel this is exactly the live PRODUCT_SPEC_KEYS set, so the existing
 * filtering behaviour is unchanged for every product in the database today.
 */
export function getAllowedSpecKeys(verticalType?: string | null): Set<string> {
  return new Set<string>(getVerticalConfig(verticalType).specKeys as readonly string[]);
}

/**
 * Resolve the vertical a newly created product should snapshot, from the
 * category it is being filed under.
 *
 * Called only on create. A product's vertical is stamped once and never
 * recomputed: re-categorising a product later must not retroactively change how
 * its specs validate or how its quality scores.
 */
export async function resolveVerticalTypeForCategory(
  db: DbReader,
  categoryId: Id<"categories">
): Promise<VerticalType> {
  const category = await db.get(categoryId);
  return effectiveVerticalType(category?.verticalType);
}

/**
 * Validates and cleans a product's details record strictly against its vertical.
 *
 * Rules:
 *   - Empty/whitespace string values are stripped.
 *   - Keys not in the vertical's allowedSpecKeys throw an Error.
 *   - If details is undefined, returns undefined.
 */
export function validateAndCleanProductDetails(
  details: Record<string, string> | undefined,
  verticalType?: string | null
): Record<string, string> | undefined {
  if (details === undefined) return undefined;
  const config = getVerticalConfig(verticalType);
  const allowedKeys = getAllowedSpecKeys(verticalType);
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(details)) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (allowedKeys.has(key)) {
      if (trimmed) {
        cleaned[key] = trimmed;
      }
    } else {
      throw new Error(
        `Invalid product specification key "${key}" for vertical "${config.id}". Allowed keys: ${[...allowedKeys].join(", ")}`
      );
    }
  }

  return cleaned;
}
