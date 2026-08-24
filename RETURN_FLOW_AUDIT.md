# Return Flow Audit

## 1. Current Porter Architecture
The current Porter integration is contained within `convex/lib/porter.ts` and triggered by actions in `convex/orders.ts` (e.g., `retryBoutiqueOrderDispatch`, line ~1021) and `convex/adminLogistics.ts`.

- **API Endpoints**: 
  - Create Order: POST `/v1/orders/create`
  - Get Quote: POST `/v1/get_quote`
  - Get Order: GET `/v1/orders/${crn}`
- **Authentication**: `x-api-key` header with `process.env.PORTER_API_KEY`. The billing is implicitly tied to this API key (the registered Porter business account). No Razorpay payment is involved in the Porter API call itself.
- **Payload (`createOrder`)**: Takes `pickup_details.address` and `drop_details.address`.
- **Return Requirements**: The return trip can use the same `createOrder` endpoint and credentials. The billing will automatically fall on the business account. The pickup and drop addresses must simply be swapped.

## 2. Current Shipment Architecture
The `shipments` table in `convex/schema.ts` tracks logistics. 
- It uses `awbNumber` to store the Porter CRN.
- It links to the original order via `orderId`.
- It stores `pickupAddress` (boutique) and `deliveryAddress` (customer).

**For Returns**: We can safely reuse the `shipments` table by adding an optional `isReturn: boolean` flag (or `shipmentType: "forward" | "return"` if we want to migrate) or by adding a `returnShipmentId` to the `orders` table. Because `awbNumber` is unique per shipment, the webhook can look up the shipment by `awbNumber` and immediately know if it's a return by checking `isReturn`.

## 3. Current Order/Address Architecture
The `orders` table stores immutable snapshots of the addresses:
- `deliveryAddress`: Customer's address.
- `pickupAddress`: Boutique's address.
These snapshots can be perfectly reused to construct the `pickup_details` (customer) and `drop_details` (boutique) for the return Porter booking.

## 4. Current Admin Order Architecture
Admin actions exist in `convex/adminOrders.ts` and `convex/adminLogistics.ts`. 
To support returns, we will need to add new mutations:
- `approveReturnAdmin`: Sets return status to approved.
- `initiateReturnAdmin`: Validates state, calls Porter `createOrder` (with swapped addresses), creates a new return `shipment` record, and links it to the order.

## 5. Current Webhook Architecture
`convex/webhooks/porter.ts` receives the webhook, verifies the signature, and extracts `order_id` (CRN) and `status`. It then calls `internal.adminLogistics.processLogisticsStatusUpdateInternal`.

In `processLogisticsStatusUpdateInternal`:
- It looks up the shipment by `awbNumber`.
- It patches the shipment.
- It patches the parent order status.
- **CRITICAL**: If `args.status === "delivered"`, it calls `markOrderFinanciallyDelivered` and `markOrderPayoutEligible`.

**Changes Required for Webhook**:
We must intercept the flow inside `processLogisticsStatusUpdateInternal` (or `handlePorterWebhook`). 
If the shipment is identified as a return (`isReturn === true`), we must:
1. Patch the return shipment status.
2. Update a new `returnStatus` field on the order (e.g., `return_delivered`).
3. **PREVENT** the execution of `markOrderFinanciallyDelivered`, `markOrderPayoutEligible`, and forward-delivery order status updates.

## 6. Exact Porter API endpoint currently used
`POST ${process.env.PORTER_API_URL}/v1/orders/create`

## 7. Exact request payload currently used
```json
{
  "request_id": "uuid_without_dashes",
  "pickup_details": { "address": { ... } },
  "drop_details": { "address": { ... } },
  "delivery_instructions": {
    "instructions_list": [
      { "type": "text", "description": "Handle with care. Order: XXXX" }
    ]
  }
}
```

## 8. How return pickup/drop should be constructed
- **Pickup Address (Customer)**: Constructed from `order.deliveryAddress`.
- **Drop Address (Boutique)**: Constructed from `order.pickupAddress`.
- The `createOrder` action should be updated or a new `createReturnOrder` action should be made to accept the swapped mapping.

## 9. Database changes required
**Minimal & backward-compatible**:
1. `schema.ts`: `orders` table:
   - Add `returnStatus: v.optional(v.string())` (e.g., "requested", "approved", "initiated", "picked_up", "delivered").
   - Add `returnShipmentId: v.optional(v.id("shipments"))`.
2. `schema.ts`: `shipments` table:
   - Add `isReturn: v.optional(v.boolean())`.

## 10. Admin UI changes required
(Note: Building the UI is not strictly requested in the prompt, only the backend state/API). 
- The admin API needs a `initiateReturnAdmin` mutation.

## 11. Webhook changes required
In `processLogisticsStatusUpdateInternal`:
```typescript
if (shipment.isReturn) {
  // Update shipment status
  // Update order.returnStatus
  // DO NOT call markOrderPayoutEligible
  return { success: true, message: "Return webhook processed" };
}
```

## 12. Idempotency strategy
- `initiateReturnAdmin` must check if `order.returnShipmentId` already exists. If yes, it aborts.
- `shipments.idempotencyKey` can be set to `return_init_${orderId}`.
- Webhooks already use idempotency by checking `fromStatus === args.status`.

## 13. Risks
- If `isReturn` is missing or false on a return shipment, the webhook will treat it as a forward delivery and trigger seller payouts. We must enforce `isReturn: true` strictly during return creation.
- Return states tracking: The `orders` table has `status` (forward delivery). We should avoid overloading this with return states to prevent breaking `activeOrders` queries. Using a separate `returnStatus` field is much safer.

## 14. Files that need modification
- `convex/schema.ts` (Add `isReturn` to shipments, `returnStatus` and `returnShipmentId` to orders)
- `convex/adminOrders.ts` or `convex/adminLogistics.ts` (Add `approveReturn` and `initiateReturn` mutations)
- `convex/adminLogistics.ts` (Update `processLogisticsStatusUpdateInternal` to handle `isReturn`)
- `convex/lib/porter.ts` (Optional: add `createReturnOrder` helper)

## 15. Files that MUST NOT be modified
- Existing Razorpay payout code in `convex/adminFinance.ts`.
- The existing forward delivery payload structure in `convex/orders.ts`.

## 16. Test plan
1. Test existing forward delivery (ensure payout triggers).
2. Approve return via Admin mutation.
3. Initiate return via Admin mutation (verify duplicate clicks do not create two trips).
4. Simulate Porter webhook with return CRN (verify `returnStatus` updates, and payout is NOT triggered).
