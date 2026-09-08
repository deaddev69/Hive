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

// ─── DATABASE-DRIVEN ATTRIBUTE SCHEMAS ──────────────────────────────────────
//
// A category may carry an admin-defined attributeSets row. When it does, that
// row — not the vertical's hardcoded specKeys — decides which keys are allowed
// and which are mandatory. When it does not, nothing changes: the vertical
// path above runs exactly as before.
//
// The two are never merged. Apparel categories have no attributeSets row, so
// every clothing product in the catalogue keeps validating against the same
// PRODUCT_SPEC_KEYS set it was created under.

/**
 * Validate a product's `details` against whichever schema governs its category.
 *
 * Prefer this over validateAndCleanProductDetails at any call site that knows
 * the category. The sync version remains correct for the vertical-only path and
 * is what this delegates to when no attribute set exists.
 */
export async function validateProductDetailsForCategory(
  db: DbReader,
  categoryId: Id<"categories">,
  details: Record<string, string> | undefined,
  verticalType?: string | null
): Promise<Record<string, string> | undefined> {
  const attributeSet = await db
    .query("attributeSets")
    .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
    .first();

  if (!attributeSet) {
    return validateAndCleanProductDetails(details, verticalType);
  }

  if (details === undefined) return undefined;

  const byKey = new Map(attributeSet.fields.map((f) => [f.key, f]));
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(details)) {
    const field = byKey.get(key);
    if (!field) {
      throw new Error(
        `"${key}" is not one of this category's attributes. Allowed: ${attributeSet.fields.map((f) => f.key).join(", ") || "(none)"}.`
      );
    }

    const trimmed = typeof value === "string" ? value.trim() : "";
    if (!trimmed) continue;

    if (field.type === "number" && !/^-?\d+(\.\d+)?$/.test(trimmed)) {
      throw new Error(`"${field.label}" must be a number. Received "${trimmed}".`);
    }

    if (field.type === "select" && field.options && !field.options.includes(trimmed)) {
      throw new Error(
        `"${trimmed}" is not a valid choice for "${field.label}". Options: ${field.options.join(", ")}.`
      );
    }

    if (field.type === "multi-select" && field.options) {
      // Stored as a comma-separated string so `details` stays Record<string,string>,
      // the shape every existing consumer of products.details already reads.
      const chosen = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
      const invalid = chosen.filter((c) => !field.options!.includes(c));
      if (invalid.length > 0) {
        throw new Error(
          `${invalid.map((c) => `"${c}"`).join(", ")} ${invalid.length === 1 ? "is not a valid choice" : "are not valid choices"} for "${field.label}". Options: ${field.options.join(", ")}.`
        );
      }
    }

    cleaned[key] = trimmed;
  }

  const missing = attributeSet.fields.filter((f) => f.required && !cleaned[f.key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required ${missing.length === 1 ? "attribute" : "attributes"}: ${missing.map((f) => f.label).join(", ")}.`
    );
  }

  return cleaned;
}

/**
 * The keys a category accepts in `details`, from its attribute set when it has
 * one and from its vertical otherwise. Used by form and preview code that needs
 * the allow-list without validating a payload.
 */
export async function getAllowedSpecKeysForCategory(
  db: DbReader,
  categoryId: Id<"categories">,
  verticalType?: string | null
): Promise<Set<string>> {
  const attributeSet = await db
    .query("attributeSets")
    .withIndex("by_categoryId", (q) => q.eq("categoryId", categoryId))
    .first();

  return attributeSet
    ? new Set(attributeSet.fields.map((f) => f.key))
    : getAllowedSpecKeys(verticalType);
}
