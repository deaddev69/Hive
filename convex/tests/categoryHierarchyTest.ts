// convex/tests/categoryHierarchyTest.ts
//
// Tests for Phase B1: getCategoryHierarchy and canonical catalog eligibility rules.
// Validates:
// 1. getTotalStock helper
// 2. isBoutiqueOpenForCatalog helper
// 3. isProductGloballyEligible canonical checks
// 4. Hierarchy rollup: parent global/serviceable counts roll up subcategory counts
// 5. Coming soon semantics: globalCount === 0 -> isComingSoon === true
// 6. Serviceability semantics: in-range vs out-of-range counts
//
// Run with: npx tsx convex/tests/categoryHierarchyTest.ts

import {
  getTotalStock,
  isBoutiqueOpenForCatalog,
  isProductGloballyEligible,
} from "../lib/catalogEligibility";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`[PASS] ${name}`);
  } else {
    failed++;
    console.error(
      `[FAIL] ${name}\n         expected ${e}\n         got      ${a}`,
    );
  }
}

// ─── 1. Stock Calculation ────────────────────────────────────────────────────
check("Stock: undefined stockBySize returns 0", getTotalStock(undefined), 0);
check("Stock: empty stockBySize returns 0", getTotalStock({}), 0);
check("Stock: all zeros returns 0", getTotalStock({ S: 0, M: 0, L: 0 }), 0);
check(
  "Stock: positive stock sums correctly",
  getTotalStock({ S: 1, M: 3, L: 2 }),
  6,
);

// ─── 2. Boutique Catalog Openness ────────────────────────────────────────────
check(
  "Boutique Open: null boutique is not open",
  isBoutiqueOpenForCatalog(null),
  false,
);
check(
  "Boutique Open: manual order acceptance false is PAUSED",
  isBoutiqueOpenForCatalog({ isAcceptingOrders: false, status: "APPROVED" }),
  false,
);
check(
  "Boutique Open: vacation mode is PAUSED",
  isBoutiqueOpenForCatalog({
    storeStatus: "closed",
    pauseReason: "vacation",
    status: "APPROVED",
  }),
  false,
);
check(
  "Boutique Open: normal operating boutique is open/accepting",
  isBoutiqueOpenForCatalog({ isAcceptingOrders: true, status: "APPROVED" }),
  true,
);

// ─── 3. Canonical Product Eligibility ────────────────────────────────────────
const validBoutique = {
  _id: "b1",
  status: "APPROVED",
  isAcceptingOrders: true,
};
const validProduct = {
  _id: "p1",
  boutiqueId: "b1",
  active: true,
  adminHidden: false,
  approvalStatus: "approved",
  stockBySize: { M: 2 },
};

check(
  "Eligibility: valid in-stock product from approved open boutique is eligible",
  isProductGloballyEligible(validProduct, validBoutique),
  true,
);
check(
  "Eligibility: inactive product is rejected",
  isProductGloballyEligible({ ...validProduct, active: false }, validBoutique),
  false,
);
check(
  "Eligibility: adminHidden product is rejected",
  isProductGloballyEligible(
    { ...validProduct, adminHidden: true },
    validBoutique,
  ),
  false,
);
check(
  "Eligibility: pending approval product is rejected",
  isProductGloballyEligible(
    { ...validProduct, approvalStatus: "pending" },
    validBoutique,
  ),
  false,
);
check(
  "Eligibility: legacy product without approvalStatus is accepted if active",
  isProductGloballyEligible(
    { ...validProduct, approvalStatus: undefined },
    validBoutique,
  ),
  true,
);
check(
  "Eligibility: product from unapproved boutique is rejected",
  isProductGloballyEligible(validProduct, {
    ...validBoutique,
    status: "PENDING",
  }),
  false,
);
check(
  "Eligibility: product with 0 stock is rejected",
  isProductGloballyEligible(
    { ...validProduct, stockBySize: { M: 0 } },
    validBoutique,
  ),
  false,
);
check(
  "Eligibility: product from paused boutique is rejected in general catalog",
  isProductGloballyEligible(validProduct, {
    ...validBoutique,
    isAcceptingOrders: false,
  }),
  false,
);
check(
  "Eligibility: product from paused boutique is allowed when browsing that specific boutique",
  isProductGloballyEligible(
    validProduct,
    { ...validBoutique, isAcceptingOrders: false },
    { isSpecificBoutique: true },
  ),
  true,
);

// ─── 4. Hierarchy Tree Aggregation Simulation ───────────────────────────────
// Simulate 3 categories:
// Root: "Women" (cat_women)
//   Child 1: "Kurtis" (cat_kurtis) -> 2 eligible products (1 serviceable, 1 unserviceable)
//   Child 2: "Anarkalis" (cat_anarkalis) -> 0 products (genuinely Coming Soon)
// Root 2: "Men" (cat_men) -> 0 products (Coming Soon)

const categories = [
  {
    _id: "cat_women",
    name: "Women's Fashion",
    slug: "womens-fashion",
    sortOrder: 1,
  },
  {
    _id: "cat_kurtis",
    parentId: "cat_women",
    name: "Kurtis",
    slug: "kurtis",
    sortOrder: 1,
  },
  {
    _id: "cat_anarkalis",
    parentId: "cat_women",
    name: "Anarkalis",
    slug: "anarkalis",
    sortOrder: 2,
  },
  { _id: "cat_men", name: "Men's Fashion", slug: "mens-fashion", sortOrder: 2 },
];

const mockProducts = [
  {
    _id: "p1",
    categoryId: "cat_kurtis",
    boutiqueId: "b_near",
    active: true,
    stockBySize: { M: 1 },
  },
  {
    _id: "p2",
    categoryId: "cat_kurtis",
    boutiqueId: "b_far",
    active: true,
    stockBySize: { L: 2 },
  },
];

// User is within range of b_near, but out of range of b_far
const deliverableBoutiqueIds = new Set(["b_near"]);

// Aggregation logic under test
const eligibleProductsByCatId = new Map<
  string,
  { id: string; serviceable: boolean }[]
>();
for (const p of mockProducts) {
  const isEligible = isProductGloballyEligible(p, validBoutique);
  if (!isEligible) continue;
  const serviceable = deliverableBoutiqueIds.has(p.boutiqueId);
  let list = eligibleProductsByCatId.get(p.categoryId);
  if (!list) {
    list = [];
    eligibleProductsByCatId.set(p.categoryId, list);
  }
  list.push({ id: p._id, serviceable });
}

const byOrder = (a: any, b: any) =>
  (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name);

const roots = categories.filter((c) => !c.parentId).sort(byOrder);
const childrenByParentId = new Map<string, any[]>();
for (const cat of categories) {
  if (cat.parentId) {
    let list = childrenByParentId.get(cat.parentId);
    if (!list) {
      list = [];
      childrenByParentId.set(cat.parentId, list);
    }
    list.push(cat);
  }
}

const resultRoots = roots.map((root) => {
  const children = (childrenByParentId.get(root._id) || []).sort(byOrder);

  const formattedChildren = children.map((child) => {
    const childProducts = eligibleProductsByCatId.get(child._id) || [];
    const globalCount = childProducts.length;
    const serviceableCount = childProducts.filter((p) => p.serviceable).length;

    return {
      _id: child._id,
      name: child.name,
      slug: child.slug,
      globalCount,
      serviceableCount,
      isComingSoon: globalCount === 0,
    };
  });

  const rootDirectProducts = eligibleProductsByCatId.get(root._id) || [];
  let rootGlobalCount = rootDirectProducts.length;
  let rootServiceableCount = rootDirectProducts.filter(
    (p) => p.serviceable,
  ).length;

  for (const child of formattedChildren) {
    rootGlobalCount += child.globalCount;
    rootServiceableCount += child.serviceableCount;
  }

  return {
    _id: root._id,
    name: root.name,
    slug: root.slug,
    globalCount: rootGlobalCount,
    serviceableCount: rootServiceableCount,
    isComingSoon: rootGlobalCount === 0,
    children: formattedChildren,
  };
});

// Assertions on resultRoots:
check("Tree: 2 roots returned", resultRoots.length, 2);

const womens = resultRoots.find((r) => r._id === "cat_women")!;
check(
  "Women root: globalCount rolls up 2 kurtis products",
  womens.globalCount,
  2,
);
check(
  "Women root: serviceableCount rolls up 1 serviceable product",
  womens.serviceableCount,
  1,
);
check("Women root: isComingSoon is false", womens.isComingSoon, false);
check("Women root: has 2 subcategories", womens.children.length, 2);

const kurtis = womens.children.find((c) => c._id === "cat_kurtis")!;
check("Kurtis: globalCount is 2", kurtis.globalCount, 2);
check("Kurtis: serviceableCount is 1", kurtis.serviceableCount, 1);
check("Kurtis: isComingSoon is false", kurtis.isComingSoon, false);

const anarkalis = womens.children.find((c) => c._id === "cat_anarkalis")!;
check("Anarkalis: globalCount is 0", anarkalis.globalCount, 0);
check("Anarkalis: serviceableCount is 0", anarkalis.serviceableCount, 0);
check(
  "Anarkalis: isComingSoon is TRUE (Coming Soon)",
  anarkalis.isComingSoon,
  true,
);

const mens = resultRoots.find((r) => r._id === "cat_men")!;
check("Men root: globalCount is 0", mens.globalCount, 0);
check("Men root: serviceableCount is 0", mens.serviceableCount, 0);
check("Men root: isComingSoon is TRUE (Coming Soon)", mens.isComingSoon, true);
check("Men root: has 0 subcategories", mens.children.length, 0);

console.log(`\nCategory Hierarchy Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
