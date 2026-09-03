// packages/types/src/verticals.ts
// Central vertical registry.
//
// A category carries a `verticalType`; a product snapshots the vertical of its
// category at creation time. The config below is the single description of what
// a vertical means — its variant vocabulary, its allowed specification keys, its
// catalogue-quality rules, and its presentation flags.
//
// This module is DATA ONLY. It holds no evaluator functions and no Convex
// imports, so it can be consumed from the backend, the partner app, the admin
// portal and the storefront alike. Scoring and validation logic lives with the
// consumer (see convex/lib/verticals.ts and convex/products.ts).
//
// Dependency direction: this module imports from ./product; ./product must NOT
// import from here. The barrel (./index) re-exports both.
//
// Return and exchange policy is deliberately absent. That policy already has a
// resolver (convex/lib/returnPolicy.ts) whose output is snapshotted onto orders
// and drives Razorpay Route payout-hold timing, and exchanges are a separate
// seller opt-in. Modelling it here is deferred until that resolver has been
// audited in full.

import { PRODUCT_SPEC_KEYS } from "./product";

// ─── VERTICAL IDENTITY ──────────────────────────────────────────────────────

export const VERTICAL_TYPES = [
  "apparel",
  "fragrance",
  "handbag",
  "footwear",
  "jewellery",
  "lifestyle",
] as const;

export type VerticalType = (typeof VERTICAL_TYPES)[number];

/** The vertical assumed for any record created before verticals existed. */
export const DEFAULT_VERTICAL_TYPE: VerticalType = "apparel";

// ─── SPECIFICATION KEYS ─────────────────────────────────────────────────────

/**
 * Every specification key already live in production.
 *
 * Derived from PRODUCT_SPEC_KEYS rather than restated, so the apparel vertical
 * is a superset of the live set by construction and cannot silently narrow it.
 * A product edited under the apparel vertical can never lose a spec it already
 * has.
 */
export type LegacySpecKey = keyof typeof PRODUCT_SPEC_KEYS;

const APPAREL_SPEC_KEYS = Object.keys(PRODUCT_SPEC_KEYS) as LegacySpecKey[];

export type FragranceSpecKey =
  | "fragranceFamily"
  | "concentration"
  | "topNotes"
  | "heartNotes"
  | "baseNotes"
  | "longevity"
  | "volumeMl"
  | "gender";

export type HandbagSpecKey =
  | "bagType"
  | "dimensions"
  | "compartments"
  | "strapType"
  | "waterResistant";

/**
 * Any key that may appear in `products.details`, across every vertical.
 *
 * Named VerticalSpecKey rather than ProductSpecKey because ./product already
 * exports a ProductSpecKey covering the apparel-era keys alone; that existing
 * type is left exactly as it is.
 *
 * Note that `material` is deliberately absent: it is a top-level column on the
 * products table, not a details key, for every vertical.
 */
export type VerticalSpecKey = LegacySpecKey | FragranceSpecKey | HandbagSpecKey;

const FRAGRANCE_SPEC_LABELS: Record<FragranceSpecKey, string> = {
  fragranceFamily: "Olfactory Family",
  concentration:   "Concentration",
  topNotes:        "Top Notes",
  heartNotes:      "Heart / Middle Notes",
  baseNotes:       "Base Notes",
  longevity:       "Longevity",
  volumeMl:        "Bottle Volume",
  gender:          "Target Profile",
};

const HANDBAG_SPEC_LABELS: Record<HandbagSpecKey, string> = {
  bagType:         "Bag Silhouette",
  dimensions:      "Dimensions (L x W x H)",
  compartments:    "Compartments & Pockets",
  strapType:       "Strap / Handle",
  waterResistant:  "Water Resistance",
};

// ─── QUALITY RULES ──────────────────────────────────────────────────────────

/**
 * Top-level product columns that carry catalogue-quality points.
 * Distinct from spec keys, which live inside `products.details`.
 */
export type QualityColumnField =
  | "material"
  | "care"
  | "origin"
  | "fitRecommendation"
  | "story";

/**
 * One scored field. `source` says where to read it from — a column on the
 * product row, or a key inside `products.details` — so the two namespaces can
 * never be confused by a consumer.
 *
 * `label` is the "what you would gain" prompt; `missingLabel` is the checklist
 * wording. Both are part of the public contract of getProductQualityDetails and
 * are asserted against the legacy strings in convex/tests/verticalsTest.ts.
 */
export type QualityRule =
  | {
      source: "column";
      field: QualityColumnField;
      points: number;
      label: string;
      missingLabel: string;
    }
  | {
      source: "detail";
      field: VerticalSpecKey;
      points: number;
      label: string;
      missingLabel: string;
    };

/**
 * Points awarded by vertical-independent rules (cover image, three photos,
 * description). Those rules stay hardcoded in the scorer; only the remaining
 * VERTICAL_QUALITY_BUDGET points are described per vertical.
 */
export const GLOBAL_QUALITY_BUDGET = 50;

/** Every vertical must distribute exactly this many points across scoredFields. */
export const VERTICAL_QUALITY_BUDGET = 50;

// ─── CONFIG SHAPE ───────────────────────────────────────────────────────────

export interface VerticalVariantConfig {
  /** Customer- and partner-facing name for the variant axis. */
  label: string;
  unit?: string;
  defaultOptions: readonly string[];
  allowCustom: boolean;
  /** Whether the chest/waist/shoulder measurement matrix applies. */
  requiresMeasurements: boolean;
}

export interface VerticalQualityConfig {
  scoredFields: readonly QualityRule[];
}

export interface VerticalPresentationConfig {
  showGarmentFitWidget: boolean;
  showScentPyramid: boolean;
  showBagDimensions: boolean;
  specIconStyle: "tailoring" | "fragrance" | "accessory" | "generic";
}

export interface VerticalPolicyConfig {
  /**
   * Commercial default for returns when no explicit product policy applies.
   * Apparel and Handbags default to true (eligible for 24h return).
   * Fragrance defaults to false (Final Sale).
   */
  defaultReturnsAccepted: boolean;
  /**
   * Commercial default for size/variant exchanges when no explicit setting applies.
   * Fragrance defaults to false (hygiene/tampering protection in transit).
   */
  defaultExchangesAccepted: boolean;
}

export interface VerticalConfig {
  id: VerticalType;
  label: string;
  variant: VerticalVariantConfig;
  specKeys: readonly VerticalSpecKey[];
  specLabels: Readonly<Record<string, string>>;
  quality: VerticalQualityConfig;
  presentation: VerticalPresentationConfig;
  policy: VerticalPolicyConfig;
}

// ─── SHARED FRAGMENTS ───────────────────────────────────────────────────────

const GENERIC_PRESENTATION: VerticalPresentationConfig = {
  showGarmentFitWidget: false,
  showScentPyramid:     false,
  showBagDimensions:    false,
  specIconStyle:        "generic",
};

const GENERIC_POLICY: VerticalPolicyConfig = {
  defaultReturnsAccepted:  true,
  defaultExchangesAccepted: true,
};

/**
 * Verticals Hive has not designed yet. Deliberately neutral: an unnamed
 * "Option" axis, colour as the only specification, and quality points on the
 * three columns that mean something for any physical good. No sizing systems
 * and no policy assumptions are invented here.
 */
const GENERIC_QUALITY: VerticalQualityConfig = {
  scoredFields: [
    { source: "column", field: "material", points: 20, label: "Add material details (+20)", missingLabel: "Add material details" },
    { source: "column", field: "care",     points: 15, label: "Add care instructions (+15)", missingLabel: "Add care instructions" },
    { source: "column", field: "origin",   points: 15, label: "Add origin info (+15)",       missingLabel: "Add origin info" },
  ],
};

const GENERIC_VARIANT: VerticalVariantConfig = {
  label:                "Option",
  defaultOptions:       ["Standard", "Free Size"],
  allowCustom:          true,
  requiresMeasurements: false,
};

// ─── REGISTRY ───────────────────────────────────────────────────────────────

export const VERTICAL_CONFIGS: Readonly<Record<VerticalType, VerticalConfig>> = {
  apparel: {
    id:    "apparel",
    label: "Apparel & Ethnic Wear",
    variant: {
      label:                "Size",
      defaultOptions:       ["XS", "S", "M", "L", "XL", "XXL", "Free"],
      allowCustom:          false,
      requiresMeasurements: true,
    },
    specKeys:   APPAREL_SPEC_KEYS,
    specLabels: PRODUCT_SPEC_KEYS,
    quality: {
      // Reproduces the pre-vertical scoring rules exactly, in their original
      // order, so no existing product's score can move.
      scoredFields: [
        { source: "column", field: "material",          points: 10, label: "Add material details (+10)",                 missingLabel: "Add material details" },
        { source: "column", field: "care",              points: 10, label: "Add care instructions (+10)",                 missingLabel: "Add care instructions" },
        { source: "column", field: "origin",            points: 10, label: "Add origin info (+10)",                       missingLabel: "Add origin info" },
        { source: "column", field: "fitRecommendation", points: 15, label: "Add fit recommendation (+15)",                missingLabel: "Add fit recommendation (Runs Small / True to Size / Runs Large)" },
        { source: "column", field: "story",             points:  5, label: "Add a design story / product narrative (+5)", missingLabel: "Add a design story / product narrative" },
      ],
    },
    presentation: {
      showGarmentFitWidget: true,
      showScentPyramid:     false,
      showBagDimensions:    false,
      specIconStyle:        "tailoring",
    },
    policy: {
      defaultReturnsAccepted:  true,
      defaultExchangesAccepted: true,
    },
  },

  fragrance: {
    id:    "fragrance",
    label: "Fragrance & Perfumes",
    variant: {
      label:                "Volume",
      unit:                 "ml",
      defaultOptions:       ["30ml", "50ml", "100ml", "150ml", "Roll-on (10ml)", "Standard"],
      allowCustom:          true,
      requiresMeasurements: false,
    },
    specKeys: [
      "fragranceFamily",
      "concentration",
      "topNotes",
      "heartNotes",
      "baseNotes",
      "longevity",
      "volumeMl",
      "gender",
    ],
    specLabels: FRAGRANCE_SPEC_LABELS,
    quality: {
      scoredFields: [
        { source: "detail", field: "concentration", points: 15, label: "Add concentration EDP/EDT (+15)", missingLabel: "Add concentration (EDP / EDT)" },
        { source: "detail", field: "topNotes",      points: 10, label: "Add top notes (+10)",             missingLabel: "Add top notes" },
        { source: "detail", field: "heartNotes",    points: 10, label: "Add heart notes (+10)",           missingLabel: "Add heart notes" },
        { source: "detail", field: "baseNotes",     points: 10, label: "Add base notes (+10)",            missingLabel: "Add base notes" },
        { source: "column", field: "origin",        points:  5, label: "Add country of origin (+5)",      missingLabel: "Add country of origin" },
      ],
    },
    presentation: {
      showGarmentFitWidget: false,
      showScentPyramid:     true,
      showBagDimensions:    false,
      specIconStyle:        "fragrance",
    },
    policy: {
      defaultReturnsAccepted:  false,
      defaultExchangesAccepted: false,
    },
  },

  handbag: {
    id:    "handbag",
    label: "Handbags & Bags",
    variant: {
      label:                "Option",
      defaultOptions:       ["One Size", "Mini", "Small", "Medium", "Large"],
      allowCustom:          true,
      requiresMeasurements: false,
    },
    // `closure` and `color` are reused from the live apparel set; `material` is
    // not listed because it is a product column, not a details key.
    specKeys: [
      "bagType",
      "dimensions",
      "compartments",
      "strapType",
      "waterResistant",
      "closure",
      "color",
    ],
    specLabels: {
      ...HANDBAG_SPEC_LABELS,
      closure: PRODUCT_SPEC_KEYS.closure,
      color:   PRODUCT_SPEC_KEYS.color,
    },
    quality: {
      scoredFields: [
        { source: "detail", field: "bagType",      points: 15, label: "Specify bag silhouette (+15)",     missingLabel: "Specify bag silhouette" },
        { source: "column", field: "material",     points: 10, label: "Add material details (+10)",       missingLabel: "Add material details" },
        { source: "detail", field: "dimensions",   points: 15, label: "Add dimensions (+15)",             missingLabel: "Add dimensions (L x W x H)" },
        { source: "detail", field: "compartments", points: 10, label: "Add compartment details (+10)",    missingLabel: "Add compartment details" },
      ],
    },
    presentation: {
      showGarmentFitWidget: false,
      showScentPyramid:     false,
      showBagDimensions:    true,
      specIconStyle:        "accessory",
    },
    policy: {
      defaultReturnsAccepted:  true,
      defaultExchangesAccepted: true,
    },
  },

  footwear: {
    id:         "footwear",
    label:      "Footwear",
    variant:    GENERIC_VARIANT,
    specKeys:   ["color"],
    specLabels: { color: PRODUCT_SPEC_KEYS.color },
    quality:    GENERIC_QUALITY,
    presentation: GENERIC_PRESENTATION,
    policy:     GENERIC_POLICY,
  },

  jewellery: {
    id:         "jewellery",
    label:      "Jewellery",
    variant:    GENERIC_VARIANT,
    specKeys:   ["color"],
    specLabels: { color: PRODUCT_SPEC_KEYS.color },
    quality:    GENERIC_QUALITY,
    presentation: GENERIC_PRESENTATION,
    policy:     GENERIC_POLICY,
  },

  lifestyle: {
    id:         "lifestyle",
    label:      "Lifestyle & Decor",
    variant:    GENERIC_VARIANT,
    specKeys:   ["color"],
    specLabels: { color: PRODUCT_SPEC_KEYS.color },
    quality:    GENERIC_QUALITY,
    presentation: GENERIC_PRESENTATION,
    policy:     GENERIC_POLICY,
  },
};

// ─── RESOLUTION ─────────────────────────────────────────────────────────────

/** True only for a value that is one of the six known verticals. */
export function isVerticalType(value?: string | null): value is VerticalType {
  return (
    typeof value === "string" &&
    (VERTICAL_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Resolve a stored value to a vertical.
 *
 * Reads are defensive: records created before verticals existed carry no
 * verticalType and must behave exactly as they did before, which means apparel.
 * Writes are not defensive — the Convex validator rejects anything that is not
 * one of the six literals.
 */
export function effectiveVerticalType(value?: string | null): VerticalType {
  return isVerticalType(value) ? value : DEFAULT_VERTICAL_TYPE;
}

export function getVerticalConfig(value?: string | null): VerticalConfig {
  return VERTICAL_CONFIGS[effectiveVerticalType(value)];
}
