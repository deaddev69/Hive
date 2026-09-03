import {
  resolveOrderReturnsAccepted,
  resolveOrderExchangesAccepted,
  type ReturnPolicyItem,
} from "../lib/returnPolicy";
import { resolvePayoutHoldDecision } from "../lib/payoutHold";
import type { Id } from "../_generated/dataModel";

/**
 * Contract tests for Return & Exchange Policy Resolution (Phase 5C).
 *
 * Verifies:
 *   1. Fragrance defaults to Final Sale (returnsAccepted: false) even when boutique default is unset.
 *   2. Fragrance can be overridden by explicit product setting or explicit boutique opt-in (true).
 *   3. Fragrance defaults to non-exchangeable (exchangesAccepted: false).
 *   4. Handbag and Apparel default to returnable & exchangeable.
 *   5. Mixed orders (Apparel + Fragrance) resolve to Final Sale (current commercial rule).
 *   6. Snapshotted return policy integrates correctly with resolvePayoutHoldDecision.
 */
export async function runReturnPolicyTests() {
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
      console.error(`[FAIL] ${name}\n         expected ${e}\n         got      ${a}`);
    }
  }

  // In-memory mock database for pure unit testing
  const mockDbData: Record<string, any> = {
    // Boutiques
    "boutique_standard": {
      _id: "boutique_standard",
      // returnsAcceptedDefault unset (undefined -> behaves as true for apparel/handbag)
    },
    "boutique_final_sale": {
      _id: "boutique_final_sale",
      returnsAcceptedDefault: false,
      exchangesAcceptedDefault: false,
    },
    "boutique_explicit_returns": {
      _id: "boutique_explicit_returns",
      returnsAcceptedDefault: true,
      exchangesAcceptedDefault: true,
    },

    // Products
    "prod_apparel_standard": {
      _id: "prod_apparel_standard",
      verticalType: "apparel",
    },
    "prod_apparel_final_sale_override": {
      _id: "prod_apparel_final_sale_override",
      verticalType: "apparel",
      returnsAccepted: false,
    },
    "prod_fragrance_default": {
      _id: "prod_fragrance_default",
      verticalType: "fragrance",
    },
    "prod_fragrance_returnable_override": {
      _id: "prod_fragrance_returnable_override",
      verticalType: "fragrance",
      returnsAccepted: true,
    },
    "prod_handbag_standard": {
      _id: "prod_handbag_standard",
      verticalType: "handbag",
    },
  };

  const mockDb: any = {
    get: async (id: string) => mockDbData[id] ?? null,
  };

  const standardBoutiqueId = "boutique_standard" as Id<"boutiques">;
  const finalSaleBoutiqueId = "boutique_final_sale" as Id<"boutiques">;
  const explicitReturnsBoutiqueId = "boutique_explicit_returns" as Id<"boutiques">;

  // ── 1. Apparel Policy Resolution ──────────────────────────────────────────
  const apparelItem: ReturnPolicyItem = {
    productId: "prod_apparel_standard" as Id<"products">,
    boutiqueId: standardBoutiqueId,
  };

  check(
    "Apparel on standard boutique defaults to returnable",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [apparelItem]),
    true
  );

  check(
    "Apparel on standard boutique defaults to exchangeable",
    await resolveOrderExchangesAccepted(mockDb, standardBoutiqueId, [apparelItem]),
    true
  );

  check(
    "Apparel on Final Sale boutique resolves to Final Sale",
    await resolveOrderReturnsAccepted(mockDb, finalSaleBoutiqueId, [
      { productId: "prod_apparel_standard" as Id<"products">, boutiqueId: finalSaleBoutiqueId },
    ]),
    false
  );

  check(
    "Apparel with explicit product returnsAccepted=false resolves to Final Sale",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [
      { productId: "prod_apparel_final_sale_override" as Id<"products">, boutiqueId: standardBoutiqueId },
    ]),
    false
  );

  // ── 2. Fragrance Policy Resolution ────────────────────────────────────────
  const fragranceItem: ReturnPolicyItem = {
    productId: "prod_fragrance_default" as Id<"products">,
    boutiqueId: standardBoutiqueId,
  };

  check(
    "Fragrance defaults to Final Sale even when boutique default is unset",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [fragranceItem]),
    false
  );

  check(
    "Fragrance defaults to non-exchangeable",
    await resolveOrderExchangesAccepted(mockDb, standardBoutiqueId, [fragranceItem]),
    false
  );

  check(
    "Fragrance allows returns when boutique explicitly sets returnsAcceptedDefault=true",
    await resolveOrderReturnsAccepted(mockDb, explicitReturnsBoutiqueId, [
      { productId: "prod_fragrance_default" as Id<"products">, boutiqueId: explicitReturnsBoutiqueId },
    ]),
    true
  );

  check(
    "Fragrance allows returns when product explicitly sets returnsAccepted=true",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [
      { productId: "prod_fragrance_returnable_override" as Id<"products">, boutiqueId: standardBoutiqueId },
    ]),
    true
  );

  // ── 3. Handbag Policy Resolution ──────────────────────────────────────────
  const handbagItem: ReturnPolicyItem = {
    productId: "prod_handbag_standard" as Id<"products">,
    boutiqueId: standardBoutiqueId,
  };

  check(
    "Handbag defaults to returnable",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [handbagItem]),
    true
  );

  check(
    "Handbag defaults to exchangeable",
    await resolveOrderExchangesAccepted(mockDb, standardBoutiqueId, [handbagItem]),
    true
  );

  // ── 4. Mixed Order Resolution (Apparel + Fragrance) ───────────────────────
  const mixedItems = [apparelItem, fragranceItem];

  check(
    "Mixed order (Returnable Apparel + Default Final Sale Fragrance) resolves order to Final Sale",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, mixedItems),
    false
  );

  check(
    "Mixed order with fragrance resolves order to non-exchangeable",
    await resolveOrderExchangesAccepted(mockDb, standardBoutiqueId, mixedItems),
    false
  );

  const mixedItemsBothReturnable = [
    apparelItem,
    { productId: "prod_fragrance_returnable_override" as Id<"products">, boutiqueId: standardBoutiqueId },
  ];

  check(
    "Mixed order where fragrance has explicit return override resolves order to returnable",
    await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, mixedItemsBothReturnable),
    true
  );

  // ── 5. Payout Hold Integration ────────────────────────────────────────────
  const DELIVERED_AT = 1_700_000_000_000;

  const returnsAcceptedFragranceOrder = await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [fragranceItem]);
  check(
    "Fragrance order payout releases immediately on delivery (final_sale_delivered)",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_FRAG",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: returnsAcceptedFragranceOrder,
      },
      DELIVERED_AT
    ),
    { action: "release", reason: "final_sale_delivered" }
  );

  const returnsAcceptedApparelOrder = await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, [apparelItem]);
  check(
    "Apparel order payout holds for 24h on delivery (return_window_open)",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_APP",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: returnsAcceptedApparelOrder,
      },
      DELIVERED_AT
    ),
    { action: "hold_until", onHoldUntil: DELIVERED_AT + 86_400_000, reason: "return_window_open" }
  );

  const returnsAcceptedMixedOrder = await resolveOrderReturnsAccepted(mockDb, standardBoutiqueId, mixedItems);
  check(
    "Mixed order payout releases immediately on delivery under current commercial rule",
    resolvePayoutHoldDecision(
      {
        status: "delivered",
        paymentStatus: "paid",
        payoutStatus: "withheld",
        razorpayTransferId: "trf_MIXED",
        payoutHoldReason: "awaiting_delivery",
        returnsAccepted: returnsAcceptedMixedOrder,
      },
      DELIVERED_AT
    ),
    { action: "release", reason: "final_sale_delivered" }
  );

  console.log(`\nReturn policy: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith("returnPolicyTest.ts")) {
  runReturnPolicyTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
