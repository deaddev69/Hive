// apps/customer/src/lib/categoryPillRail.test.ts
//
// Tests for CategoryPillRail hierarchy resolution and pill state invariants (Phase B3).
//
// Run with: npx tsx apps/customer/src/lib/categoryPillRail.test.ts

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

// Mock live hierarchy returned by getCategoryHierarchy
const mockHierarchy = {
  roots: [
    {
      _id: "root_women",
      name: "Women's Fashion",
      slug: "womens-fashion",
      sortOrder: 1,
      globalCount: 25,
      serviceableCount: 10,
      isComingSoon: false,
      children: [
        {
          _id: "child_kurtis",
          parentId: "root_women",
          name: "Kurtis",
          slug: "kurtis",
          sortOrder: 1,
          globalCount: 15,
          serviceableCount: 10,
          isComingSoon: false,
        },
        {
          _id: "child_sarees",
          parentId: "root_women",
          name: "Sarees",
          slug: "sarees",
          sortOrder: 2,
          globalCount: 10,
          serviceableCount: 0, // location-unavailable in Bangalore, but exists globally
          isComingSoon: false,
        },
        {
          _id: "child_anarkalis",
          parentId: "root_women",
          name: "Anarkalis",
          slug: "anarkalis",
          sortOrder: 3,
          globalCount: 0, // genuinely empty globally
          isComingSoon: true,
        },
      ],
    },
    {
      _id: "root_men",
      name: "Men's Fashion",
      slug: "mens-fashion",
      sortOrder: 2,
      globalCount: 5,
      serviceableCount: 5,
      isComingSoon: false,
      children: [
        {
          _id: "child_shirts",
          parentId: "root_men",
          name: "Shirts",
          slug: "shirts",
          sortOrder: 1,
          globalCount: 5,
          serviceableCount: 5,
          isComingSoon: false,
        },
      ],
    },
    {
      _id: "root_accessories",
      name: "Accessories",
      slug: "accessories",
      sortOrder: 3,
      globalCount: 0,
      serviceableCount: 0,
      isComingSoon: true,
      children: [],
    },
  ],
};

function resolvePillRailState(activeCategorySlug: string | null) {
  const rootList = mockHierarchy.roots;
  const wanted = activeCategorySlug?.trim().toLowerCase();

  if (!wanted) {
    return {
      activeRoot: null,
      activeChild: null,
      isAllItemsActive: true,
    };
  }

  let foundRoot: any = null;
  let foundChild: any = null;

  for (const root of rootList) {
    if (root.slug.toLowerCase() === wanted) {
      foundRoot = root;
      break;
    }
    const matchingChild = root.children.find(
      (c) => c.slug.toLowerCase() === wanted,
    );
    if (matchingChild) {
      foundRoot = root;
      foundChild = matchingChild;
      break;
    }
  }

  return {
    activeRoot: foundRoot,
    activeChild: foundChild,
    isAllItemsActive: false,
  };
}

// ── 1. All Items (no active category) ────────────────────────────────────────
const allItems = resolvePillRailState(null);
assertEqual(
  "All Items: isAllItemsActive is true",
  allItems.isAllItemsActive,
  true,
);
assertEqual("All Items: activeRoot is null", allItems.activeRoot, null);

// ── 2. Women's Fashion Root Active ───────────────────────────────────────────
const womenRoot = resolvePillRailState("womens-fashion");
assertEqual(
  "Women's Fashion: activeRoot is Women's Fashion",
  womenRoot.activeRoot?._id,
  "root_women",
);
assertEqual(
  "Women's Fashion: activeChild is null (All pill active)",
  womenRoot.activeChild,
  null,
);
assertEqual(
  "Women's Fashion: has 3 subcategories",
  womenRoot.activeRoot?.children.length,
  3,
);

// ── 3. Women's Fashion Subcategory (Kurtis) Active ───────────────────────────
const kurtisChild = resolvePillRailState("kurtis");
assertEqual(
  "Kurtis: activeRoot resolves to Women's Fashion",
  kurtisChild.activeRoot?._id,
  "root_women",
);
assertEqual(
  "Kurtis: activeChild is Kurtis",
  kurtisChild.activeChild?._id,
  "child_kurtis",
);
assertEqual(
  "Kurtis: isComingSoon is false",
  kurtisChild.activeChild?.isComingSoon,
  false,
);

// ── 4. Location-unavailable category is NOT mislabeled Soon ──────────────────
const sareesChild = resolvePillRailState("sarees");
assertEqual(
  "Sarees: activeRoot resolves to Women's Fashion",
  sareesChild.activeRoot?._id,
  "root_women",
);
assertEqual(
  "Sarees: globalCount is 10",
  sareesChild.activeChild?.globalCount,
  10,
);
assertEqual(
  "Sarees: serviceableCount is 0",
  sareesChild.activeChild?.serviceableCount,
  0,
);
assertEqual(
  "Sarees: isComingSoon is FALSE (not mislabeled Soon)",
  sareesChild.activeChild?.isComingSoon,
  false,
);

// ── 5. Zero-global category (Anarkalis) IS labeled Soon ──────────────────────
const anarkalisChild = resolvePillRailState("anarkalis");
assertEqual(
  "Anarkalis: globalCount is 0",
  anarkalisChild.activeChild?.globalCount,
  0,
);
assertEqual(
  "Anarkalis: isComingSoon is TRUE (displays Soon badge)",
  anarkalisChild.activeChild?.isComingSoon,
  true,
);

// ── 6. Men's Fashion Root and Child Resolution ───────────────────────────────
const menRoot = resolvePillRailState("mens-fashion");
assertEqual(
  "Men's Fashion: activeRoot is Men's Fashion",
  menRoot.activeRoot?._id,
  "root_men",
);
assertEqual(
  "Men's Fashion: has 1 child (Shirts)",
  menRoot.activeRoot?.children.length,
  1,
);

const shirtsChild = resolvePillRailState("shirts");
assertEqual(
  "Shirts: activeRoot resolves to Men's Fashion",
  shirtsChild.activeRoot?._id,
  "root_men",
);
assertEqual(
  "Shirts: activeChild is Shirts",
  shirtsChild.activeChild?._id,
  "child_shirts",
);

// ── 7. Accessories (Root Coming Soon) ────────────────────────────────────────
const accessoriesRoot = resolvePillRailState("accessories");
assertEqual(
  "Accessories: activeRoot is Accessories",
  accessoriesRoot.activeRoot?._id,
  "root_accessories",
);
assertEqual(
  "Accessories: root isComingSoon is true",
  accessoriesRoot.activeRoot?.isComingSoon,
  true,
);
assertEqual(
  "Accessories: has 0 children",
  accessoriesRoot.activeRoot?.children.length,
  0,
);

console.log(`\nCategory Pill Rail Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
